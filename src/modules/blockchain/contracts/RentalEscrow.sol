// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RentalEscrow
 * @notice Escrow contract that safeguards rental deposits between renters and vehicle owners.
 * @dev Intended for deployment on Ethereum Sepolia testnet.
 */
contract RentalEscrow is Ownable, ReentrancyGuard {
    enum DepositStatus {
        None,
        Deposited,
        Released,
        Refunded
    }

    struct Rental {
        address renter;
        address owner;
        uint256 amount;
        DepositStatus status;
    }

    /// @notice Tracks rental information by rental identifier.
    mapping(uint256 => Rental) private rentals;

    /// @notice Optional delegation list for accounts allowed to release or refund funds.
    mapping(address => bool) public authorizedOperators;

    event Deposited(uint256 indexed rentalId, address indexed renter, address indexed owner, uint256 amount);
    event Released(uint256 indexed rentalId, address indexed owner, uint256 amount);
    event Refunded(uint256 indexed rentalId, address indexed renter, uint256 amount);
    event OperatorAuthorizationUpdated(address indexed operator, bool allowed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Adds or removes an authorized operator able to release or refund funds.
     * @param operator Address being granted or revoked permission.
     * @param allowed Set to true to authorize, false to revoke.
     */
    function setAuthorizedOperator(address operator, bool allowed) external onlyOwner {
        authorizedOperators[operator] = allowed;
        emit OperatorAuthorizationUpdated(operator, allowed);
    }

    /**
     * @notice Deposits escrowed funds for a specific rental agreement.
     * @param rentalId Identifier referencing the rental reservation.
     * @param owner Address of the vehicle owner that will receive funds upon completion.
     */
    function deposit(uint256 rentalId, address owner) external payable nonReentrant {
        require(owner != address(0), "Owner required");
        require(msg.value > 0, "Deposit must be > 0");

        Rental storage rental = rentals[rentalId];
        require(rental.status == DepositStatus.None || rental.status == DepositStatus.Released || rental.status == DepositStatus.Refunded, "Active deposit exists");

        rentals[rentalId] = Rental({
            renter: msg.sender,
            owner: owner,
            amount: msg.value,
            status: DepositStatus.Deposited
        });

        emit Deposited(rentalId, msg.sender, owner, msg.value);
    }

    /**
     * @notice Releases escrowed funds to the owner after successful rental completion.
     * @param rentalId Identifier referencing the rental reservation.
     */
    function releaseFunds(uint256 rentalId) external nonReentrant {
        require(_isAuthorized(msg.sender), "Not authorized");

        Rental storage rental = rentals[rentalId];
        require(rental.status == DepositStatus.Deposited, "No deposit to release");

        uint256 amount = rental.amount;
        address ownerAddress = rental.owner;
        rental.amount = 0;
        rental.status = DepositStatus.Released;

        (bool success, ) = ownerAddress.call{value: amount}("");
        require(success, "Transfer failed");

        emit Released(rentalId, ownerAddress, amount);
    }

    /**
     * @notice Refunds escrowed funds back to the renter when rental conditions are not satisfied.
     * @param rentalId Identifier referencing the rental reservation.
     */
    function refund(uint256 rentalId) external nonReentrant {
        require(_isAuthorized(msg.sender), "Not authorized");

        Rental storage rental = rentals[rentalId];
        require(rental.status == DepositStatus.Deposited, "No deposit to refund");

        uint256 amount = rental.amount;
        address renterAddress = rental.renter;
        rental.amount = 0;
        rental.status = DepositStatus.Refunded;

        (bool success, ) = renterAddress.call{value: amount}("");
        require(success, "Transfer failed");

        emit Refunded(rentalId, renterAddress, amount);
    }

    /**
     * @notice Retrieves the stored rental information for a given rental identifier.
     * @param rentalId Identifier referencing the rental reservation.
     * @return renter Address that deposited funds.
     * @return owner Address designated to receive funds.
     * @return amount Amount of deposit currently held.
     * @return status Status of the deposit lifecycle.
     */
    function getRental(uint256 rentalId)
        external
        view
        returns (address renter, address owner, uint256 amount, DepositStatus status)
    {
        Rental storage rental = rentals[rentalId];
        return (rental.renter, rental.owner, rental.amount, rental.status);
    }

    /**
     * @notice Checks whether an address is permitted to administrate escrow actions.
     * @param account Address to evaluate.
     * @return True if address is owner or authorized operator.
     */
    function _isAuthorized(address account) internal view returns (bool) {
        return account == owner() || authorizedOperators[account];
    }
}
