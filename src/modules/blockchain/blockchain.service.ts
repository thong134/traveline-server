import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Contract,
  ContractFactory,
  JsonRpcProvider,
  Wallet,
  formatEther,
  isAddress,
  parseEther,
} from 'ethers';
import type { ContractTransactionResponse } from 'ethers';
import { Repository } from 'typeorm';
import {
  BlockchainTransactionStatus,
  BlockchainTransactionType,
  RentalTransaction,
} from './entities/rental-transaction.entity';

const RENTAL_ESCROW_ABI = [
  'constructor(address _owner)',
  'function deposit(uint256 rentalId, address owner) payable',
  'function releaseFunds(uint256 rentalId)',
  'function refund(uint256 rentalId)',
  'function getRental(uint256 rentalId) view returns (address renter, address owner, uint256 amount, uint8 status)',
];

type RentalEscrowStruct = {
  renter: string;
  owner: string;
  amount: bigint;
  status: bigint;
} & [string, string, bigint, bigint];

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly provider: JsonRpcProvider;
  private rentalEscrowAddress?: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(RentalTransaction)
    private readonly transactionsRepo: Repository<RentalTransaction>,
  ) {
    const rpcUrl =
      this.configService.get<string>('SEPOLIA_RPC_URL') ??
      this.configService.get<string>('ETHEREUM_RPC_URL');

    if (!rpcUrl) {
      throw new Error(
        'Missing Ethereum RPC URL configuration (SEPOLIA_RPC_URL)',
      );
    }

    this.provider = new JsonRpcProvider(rpcUrl);
    this.rentalEscrowAddress =
      this.configService.get<string>('RENTAL_ESCROW_ADDRESS') ?? undefined;
  }

  /**
   * Deploys a new RentalEscrow contract instance using the configured admin credentials.
   */
  async deployContract(): Promise<{
    contractAddress: string;
    transactionHash: string;
  }> {
    const adminPrivateKey = this.configService.get<string>(
      'BLOCKCHAIN_ADMIN_PRIVATE_KEY',
    );
    if (!adminPrivateKey) {
      throw new Error(
        'BLOCKCHAIN_ADMIN_PRIVATE_KEY must be configured to deploy the contract',
      );
    }

    const bytecode = this.configService.get<string>('RENTAL_ESCROW_BYTECODE');
    if (!bytecode) {
      throw new Error(
        'RENTAL_ESCROW_BYTECODE must be provided to deploy the contract',
      );
    }

    const wallet = new Wallet(adminPrivateKey, this.provider);
    
    // Check balance before deployment
    const balance = await this.provider.getBalance(wallet.address);
    const balanceEth = formatEther(balance);
    const feeData = await this.provider.getFeeData();
    
    this.logger.log(`Admin wallet: ${wallet.address}`);
    this.logger.log(`Balance: ${balanceEth} ETH`);
    this.logger.log(`Current Gas Price: ${formatEther(feeData.gasPrice ?? 0n)} ETH`);

    if (balance === 0n) {
      throw new Error(
        `Admin wallet ${wallet.address} has 0 ETH. Please get some Sepolia ETH from a faucet first.`,
      );
    }

    // Protection: don't deploy if already configured (unless forced or for debugging)
    if (this.rentalEscrowAddress) {
      throw new Error(
        `Contract is already deployed at ${this.rentalEscrowAddress}. To redeploy, please clear RENTAL_ESCROW_ADDRESS in .env or restart the server.`,
      );
    }

    const ownerOverride = this.configService.get<string>(
      'RENTAL_ESCROW_OWNER_ADDRESS',
    );
    const contractFactory = new ContractFactory(
      RENTAL_ESCROW_ABI,
      bytecode,
      wallet,
    );

    this.logger.log(`Deploying RentalEscrow contract from ${wallet.address}...`);

    try {
      // The RentalEscrow contract expects an owner address in the constructor.
      const contract = await contractFactory.deploy(wallet.address);
      const deploymentTx = contract.deploymentTransaction();
      if (!deploymentTx) {
        throw new Error('Failed to obtain deployment transaction.');
      }

      this.logger.log(`Waiting for deployment transaction: ${deploymentTx.hash}`);
      const receipt = await deploymentTx.wait();
      if (!receipt) {
        throw new Error('Deployment transaction receipt not found.');
      }

      const deployedAddress = contract.target as string;
      this.rentalEscrowAddress = deployedAddress;

      this.logger.log(
        `RentalEscrow deployed at ${deployedAddress} (tx: ${deploymentTx.hash})`,
      );

      return {
        contractAddress: deployedAddress,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      if (error.code === 'CALL_EXCEPTION' || error.code === 'INSUFFICIENT_FUNDS') {
        this.logger.error(
          `Deployment failed: ${error.reason || 'Insufficient funds or execution reverted'}. Check if wallet ${wallet.address} has enough ETH.`,
        );
      }
      throw error;
    }
  }

  /**
   * Sends ETH deposit to the escrow contract for a rental.
   */
  async deposit(
    rentalId: number,
    ownerAddress: string,
    amountEth: string,
    renterPrivateKey: string,
  ): Promise<{ transactionHash: string }> {
    this.ensureContractAddress();
    if (!isAddress(ownerAddress)) {
      throw new Error('Invalid owner address provided.');
    }

    const wallet = new Wallet(renterPrivateKey, this.provider);
    const contract = this.getContract(wallet);
    const valueWei = parseEther(amountEth);
    const gasEstimate = await contract.deposit.estimateGas(
      rentalId,
      ownerAddress,
      { value: valueWei },
    );
    const gasLimit = this.addGasBuffer(gasEstimate);

    const tx = (await contract.deposit(rentalId, ownerAddress, {
      value: valueWei,
      gasLimit,
    })) as ContractTransactionResponse;

    const transaction = await this.recordPendingTransaction({
      rentalId,
      txHash: tx.hash,
      from: wallet.address,
      to: this.getContractAddress(),
      amountWei: valueWei,
      type: BlockchainTransactionType.DEPOSIT,
    });

    try {
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not found.');
      }
      await this.markTransactionStatus(
        transaction.id,
        BlockchainTransactionStatus.CONFIRMED,
      );
    } catch (error) {
      await this.markTransactionStatus(
        transaction.id,
        BlockchainTransactionStatus.FAILED,
        this.extractErrorMessage(error),
      );
      this.logger.error(
        `Deposit failed for rental ${rentalId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    return { transactionHash: tx.hash };
  }

  /**
   * Server-side deposit using admin/custodial wallet.
   * This allows the system to deposit on behalf of users without requiring their private keys.
   * The amountEth is symbolic/converted from VND using a configured exchange rate.
   */
  async adminDepositForRental(
    rentalId: number,
    ownerAddress: string,
    amountEth: string,
  ): Promise<{ transactionHash: string; blockchainRecorded: boolean }> {
    const adminPrivateKey = this.configService.get<string>(
      'BLOCKCHAIN_ADMIN_PRIVATE_KEY',
    );

    if (!adminPrivateKey) {
      this.logger.warn(
        `No admin private key configured. Skipping blockchain deposit for rental ${rentalId}`,
      );
      return { transactionHash: '', blockchainRecorded: false };
    }

    if (!this.getContractAddress()) {
      this.logger.warn(
        `No escrow contract address configured. Skipping blockchain deposit for rental ${rentalId}`,
      );
      return { transactionHash: '', blockchainRecorded: false };
    }

    if (!isAddress(ownerAddress)) {
      throw new Error('Invalid owner address provided.');
    }

    const wallet = new Wallet(adminPrivateKey, this.provider);
    const contract = this.getContract(wallet);
    const valueWei = parseEther(amountEth);

    try {
      const gasEstimate = await contract.deposit.estimateGas(
        rentalId,
        ownerAddress,
        { value: valueWei },
      );
      const gasLimit = this.addGasBuffer(gasEstimate);

      const tx = (await contract.deposit(rentalId, ownerAddress, {
        value: valueWei,
        gasLimit,
      })) as ContractTransactionResponse;

      const transaction = await this.recordPendingTransaction({
        rentalId,
        txHash: tx.hash,
        from: wallet.address,
        to: this.getContractAddress(),
        amountWei: valueWei,
        type: BlockchainTransactionType.DEPOSIT,
      });

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not found.');
      }

      await this.markTransactionStatus(
        transaction.id,
        BlockchainTransactionStatus.CONFIRMED,
      );

      this.logger.log(
        `Admin deposited ${amountEth} ETH for rental ${rentalId} (tx: ${tx.hash})`,
      );

      return { transactionHash: tx.hash, blockchainRecorded: true };
    } catch (error) {
      this.logger.error(
        `Admin deposit failed for rental ${rentalId}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - blockchain failure shouldn't block the rental flow
      return { transactionHash: '', blockchainRecorded: false };
    }
  }

  /**
   * Releases escrowed funds to the owner for a completed rental.
   */
  async releaseFunds(
    rentalId: number,
    adminPrivateKey: string,
  ): Promise<{ transactionHash: string }> {
    const wallet = new Wallet(adminPrivateKey, this.provider);
    const contract = this.getContract(wallet);
    const gasEstimate = await contract.releaseFunds.estimateGas(rentalId);
    const tx = (await contract.releaseFunds(rentalId, {
      gasLimit: this.addGasBuffer(gasEstimate),
    })) as ContractTransactionResponse;

    const transaction = await this.recordPendingTransaction({
      rentalId,
      txHash: tx.hash,
      from: wallet.address,
      to: this.getContractAddress(),
      amountWei: 0n,
      type: BlockchainTransactionType.RELEASE,
    });

    try {
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not found.');
      }
      await this.markTransactionStatus(
        transaction.id,
        BlockchainTransactionStatus.CONFIRMED,
      );
    } catch (error) {
      await this.markTransactionStatus(
        transaction.id,
        BlockchainTransactionStatus.FAILED,
        this.extractErrorMessage(error),
      );
      this.logger.error(
        `Release funds failed for rental ${rentalId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    return { transactionHash: tx.hash };
  }

  /**
   * Server-side release funds using admin wallet.
   */
  async adminReleaseFundsForRental(
    rentalId: number,
  ): Promise<{ transactionHash: string; blockchainRecorded: boolean }> {
    const adminPrivateKey = this.configService.get<string>(
      'BLOCKCHAIN_ADMIN_PRIVATE_KEY',
    );

    if (!adminPrivateKey || !this.getContractAddress()) {
      this.logger.warn(
        `Blockchain not configured. Skipping release for rental ${rentalId}`,
      );
      return { transactionHash: '', blockchainRecorded: false };
    }

    try {
      const result = await this.releaseFunds(rentalId, adminPrivateKey);
      this.logger.log(
        `Admin released funds for rental ${rentalId} (tx: ${result.transactionHash})`,
      );
      return { transactionHash: result.transactionHash, blockchainRecorded: true };
    } catch (error) {
      this.logger.error(
        `Admin release failed for rental ${rentalId}`,
        error instanceof Error ? error.stack : undefined,
      );
      return { transactionHash: '', blockchainRecorded: false };
    }
  }

  /**
   * Server-side refund using admin wallet.
   */
  async adminRefundForRental(
    rentalId: number,
  ): Promise<{ transactionHash: string; blockchainRecorded: boolean }> {
    const adminPrivateKey = this.configService.get<string>(
      'BLOCKCHAIN_ADMIN_PRIVATE_KEY',
    );

    if (!adminPrivateKey || !this.getContractAddress()) {
      this.logger.warn(
        `Blockchain not configured. Skipping refund for rental ${rentalId}`,
      );
      return { transactionHash: '', blockchainRecorded: false };
    }

    try {
      const result = await this.refund(rentalId, adminPrivateKey);
      this.logger.log(
        `Admin refunded for rental ${rentalId} (tx: ${result.transactionHash})`,
      );
      return { transactionHash: result.transactionHash, blockchainRecorded: true };
    } catch (error) {
      this.logger.error(
        `Admin refund failed for rental ${rentalId}`,
        error instanceof Error ? error.stack : undefined,
      );
      return { transactionHash: '', blockchainRecorded: false };
    }
  }

  /**
   * Refunds escrowed funds back to the renter.
   */
  async refund(
    rentalId: number,
    adminPrivateKey: string,
  ): Promise<{ transactionHash: string }> {
    const wallet = new Wallet(adminPrivateKey, this.provider);
    const contract = this.getContract(wallet);
    const gasEstimate = await contract.refund.estimateGas(rentalId);
    const tx = (await contract.refund(rentalId, {
      gasLimit: this.addGasBuffer(gasEstimate),
    })) as ContractTransactionResponse;

    const transaction = await this.recordPendingTransaction({
      rentalId,
      txHash: tx.hash,
      from: wallet.address,
      to: this.getContractAddress(),
      amountWei: 0n,
      type: BlockchainTransactionType.REFUND,
    });

    try {
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not found.');
      }
      await this.markTransactionStatus(
        transaction.id,
        BlockchainTransactionStatus.CONFIRMED,
      );
    } catch (error) {
      await this.markTransactionStatus(
        transaction.id,
        BlockchainTransactionStatus.FAILED,
        this.extractErrorMessage(error),
      );
      this.logger.error(
        `Refund failed for rental ${rentalId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    return { transactionHash: tx.hash };
  }

  /**
   * Reads the rental record from the contract.
   */
  async getRentalInfo(rentalId: number): Promise<{
    renter: string;
    owner: string;
    amountWei: string;
    amountEth: string;
    status: number;
  }> {
    this.ensureContractAddress();
    const contract = new Contract(
      this.getContractAddress(),
      RENTAL_ESCROW_ABI,
      this.provider,
    );
    const rentalData = (await contract.getRental(
      rentalId,
    )) as RentalEscrowStruct;

    const renter = rentalData.renter;
    const owner = rentalData.owner;
    const amount = rentalData.amount;
    const status = Number(rentalData.status ?? rentalData[3]);

    return {
      renter,
      owner,
      amountWei: amount.toString(),
      amountEth: formatEther(amount),
      status,
    };
  }

  private ensureContractAddress(): void {
    if (!this.getContractAddress()) {
      throw new Error('Rental escrow contract address is not configured.');
    }
  }

  private getContractAddress(): string {
    return (
      this.rentalEscrowAddress ??
      this.configService.get<string>('RENTAL_ESCROW_ADDRESS') ??
      ''
    );
  }

  private getContract(signer: Wallet): Contract {
    const address = this.getContractAddress();
    if (!address) {
      throw new Error('Rental escrow contract address is not configured.');
    }
    return new Contract(address, RENTAL_ESCROW_ABI, signer);
  }

  private addGasBuffer(estimate: bigint): bigint {
    // Add a 10% buffer to avoid under-estimation
    return (estimate * 110n) / 100n;
  }

  private async recordPendingTransaction(params: {
    rentalId: number;
    txHash: string;
    from: string;
    to: string;
    amountWei: bigint;
    type: BlockchainTransactionType;
  }): Promise<RentalTransaction> {
    const entity = this.transactionsRepo.create({
      rentalId: params.rentalId,
      txHash: params.txHash,
      fromAddress: params.from,
      toAddress: params.to,
      amountWei: params.amountWei.toString(),
      amountEth: formatEther(params.amountWei),
      transactionType: params.type,
      status: BlockchainTransactionStatus.PENDING,
    });
    return this.transactionsRepo.save(entity);
  }

  private async markTransactionStatus(
    transactionId: number,
    status: BlockchainTransactionStatus,
    errorReason?: string,
  ): Promise<void> {
    await this.transactionsRepo.update(transactionId, {
      status,
      errorReason,
    });
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (!error) {
      return undefined;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return undefined;
    }
  }
}
