const hre = require("hardhat");

async function main() {
  // For live networks (amoy/polygon), Hardhat needs PRIVATE_KEY in `.env` to create a signer.
  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "No signer accounts found. Create a `.env` from `.env.example` and set `PRIVATE_KEY` (and the matching Polygon RPC URL)."
    );
  }

  const signer = signers[0];
  const balance = await signer.getBalance();

  const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");

  // Better error message on live networks: estimate deployment gas and compare with signer balance.
  let estimatedCost = null;
  try {
    const provider = hre.ethers.provider;
    const deployTx = EscrowFactory.getDeployTransaction();
    const gasEstimate = await signer.estimateGas(deployTx);
    const gasPrice = await provider.getGasPrice();
    estimatedCost = gasEstimate.mul(gasPrice);

    console.log(`Deployer: ${await signer.getAddress()}`);
    console.log(`Deployer balance: ${hre.ethers.utils.formatEther(balance)} POL (native token)`);
    console.log(`Estimated deploy cost: ${hre.ethers.utils.formatEther(estimatedCost)} POL`);

    if (balance.lt(estimatedCost)) {
      throw new Error(
        `Insufficient POL for deployment gas.\n` +
          `Balance: ${hre.ethers.utils.formatEther(balance)}\n` +
          `Estimated deploy cost: ${hre.ethers.utils.formatEther(estimatedCost)}\n` +
          `Top up the deployer account with more POL on Polygon Amoy.`
      );
    }
  } catch (e) {
    // Non-fatal: still try to deploy even if estimate fails.
    console.warn("Gas estimation skipped (continuing to deploy):", e?.message || e);
  }

  const factory = await EscrowFactory.deploy();
  await factory.deployed();

  console.log(`EscrowFactory deployed to: ${factory.address}`);
  console.log(
    "Create escrows with: factory.createEscrow(client, freelancer, amountWei)"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
