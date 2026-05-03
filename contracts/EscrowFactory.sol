// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Escrow.sol";

/**
 * @title EscrowFactory
 * @notice Deploys one `Escrow` instance per job and initializes it in the same transaction.
 */
contract EscrowFactory {
    uint256 public escrowCount;

    event EscrowDeployed(
        address indexed escrow,
        address indexed client,
        address indexed freelancer,
        uint256 amount,
        uint256 escrowId
    );

    /**
     * @param client Client wallet.
     * @param freelancer Freelancer wallet.
     * @param amount Agreed amount in wei.
     * @return escrowAddr Address of the new escrow contract.
     */
    function createEscrow(address client, address freelancer, uint256 amount)
        external
        returns (address escrowAddr)
    {
        Escrow escrow = new Escrow(address(this));
        escrow.createEscrow(client, freelancer, amount);
        escrowAddr = address(escrow);
        escrowCount += 1;
        emit EscrowDeployed(escrowAddr, client, freelancer, amount, escrowCount);
        return escrowAddr;
    }
}
