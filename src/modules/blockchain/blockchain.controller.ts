import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';
import { BlockchainService } from './blockchain.service';

class DepositRequestDto {
  @ApiProperty({
    description: 'Ethereum address of the vehicle owner',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  ownerAddress!: string;

  @ApiProperty({
    description:
      'Deposit amount expressed in ETH (string to preserve precision)',
    example: '0.25',
  })
  @IsString()
  @IsNotEmpty()
  amountEth!: string;

  @ApiProperty({
    description:
      'Private key of the renter wallet that signs the deposit transaction',
    example: '0xabc123... (never expose in production environments)',
  })
  @IsString()
  @IsNotEmpty()
  renterPrivateKey!: string;
}

class AdminActionRequestDto {
  @ApiProperty({
    description:
      'Administrator wallet private key that is authorized to release or refund deposits',
    example: '0xdef456... (use secure vaults for production)',
  })
  @IsString()
  @IsNotEmpty()
  adminPrivateKey!: string;
}

@ApiTags('blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post('deploy')
  @ApiOperation({ summary: 'Deploy the RentalEscrow smart contract' })
  @ApiOkResponse({
    description: 'Deployment transaction hash and contract address',
  })
  deployContract() {
    return this.blockchainService.deployContract();
  }

  @Post('rentals/:rentalId/deposit')
  @ApiOperation({ summary: 'Deposit rental funds into escrow' })
  @ApiBody({ type: DepositRequestDto })
  @ApiOkResponse({ description: 'Transaction hash for the deposit' })
  deposit(
    @Param('rentalId', ParseIntPipe) rentalId: number,
    @Body() body: DepositRequestDto,
  ) {
    return this.blockchainService.deposit(
      rentalId,
      body.ownerAddress,
      body.amountEth,
      body.renterPrivateKey,
    );
  }

  @Post('rentals/:rentalId/release')
  @ApiOperation({ summary: 'Release escrowed funds to the owner' })
  @ApiBody({ type: AdminActionRequestDto })
  @ApiOkResponse({ description: 'Transaction hash for the release' })
  releaseFunds(
    @Param('rentalId', ParseIntPipe) rentalId: number,
    @Body() body: AdminActionRequestDto,
  ) {
    return this.blockchainService.releaseFunds(rentalId, body.adminPrivateKey);
  }

  @Post('rentals/:rentalId/refund')
  @ApiOperation({ summary: 'Refund escrowed funds back to the renter' })
  @ApiBody({ type: AdminActionRequestDto })
  @ApiOkResponse({ description: 'Transaction hash for the refund' })
  refund(
    @Param('rentalId', ParseIntPipe) rentalId: number,
    @Body() body: AdminActionRequestDto,
  ) {
    return this.blockchainService.refund(rentalId, body.adminPrivateKey);
  }

  @Get('rentals/:rentalId')
  @ApiOperation({ summary: 'Retrieve escrow information for a rental' })
  @ApiOkResponse({ description: 'Escrow details for the rental' })
  getRentalInfo(@Param('rentalId', ParseIntPipe) rentalId: number) {
    return this.blockchainService.getRentalInfo(rentalId);
  }
}
