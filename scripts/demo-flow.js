const hre = require("hardhat");

function requireEnv(name) {
  const v = process.env[name];
  if (!v || String(v).trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

async function main() {
  const action = (process.env.ACTION || "approve").toLowerCase();
  if (action !== "approve" && action !== "reject") {
    throw new Error(`Invalid ACTION. Use "approve" or "reject". Got: ${process.env.ACTION}`);
  }

  const factoryAddress = requireEnv("FACTORY_ADDRESS");
  const workReference = requireEnv("WORK_REFERENCE");

  const amountWei = process.env.AMOUNT_WEI
    ? hre.ethers.BigNumber.from(process.env.AMOUNT_WEI)
    : hre.ethers.utils.parseEther(requireEnv("AMOUNT_ETH"));

  // On live Polygon we need multiple wallets (client + freelancer) to satisfy role checks.
  const provider = hre.ethers.provider;

  // Polygon Amoy can enforce a relatively high minimum gas tip. Allow overrides via env,
  // otherwise default to a safe set of EIP-1559 values.
  const maxFeeGwei =
    process.env.MAX_FEE_GWEI && String(process.env.MAX_FEE_GWEI).trim() !== ""
      ? process.env.MAX_FEE_GWEI
      : "40";
  const maxPriorityFeeGwei =
    process.env.MAX_PRIORITY_FEE_GWEI && String(process.env.MAX_PRIORITY_FEE_GWEI).trim() !== ""
      ? process.env.MAX_PRIORITY_FEE_GWEI
      : "30";

  const gasOverrides = {
    maxFeePerGas: hre.ethers.utils.parseUnits(maxFeeGwei, "gwei"),
    maxPriorityFeePerGas: hre.ethers.utils.parseUnits(maxPriorityFeeGwei, "gwei"),
  };

  const signers = await hre.ethers.getSigners();
  const deployerSigner = signers[0];

  const clientPk = process.env.CLIENT_PRIVATE_KEY;
  const freelancerPk = process.env.FREELANCER_PRIVATE_KEY;

  let clientSigner;
  let freelancerSigner;

  if (clientPk && freelancerPk) {
    clientSigner = new hre.ethers.Wallet(clientPk, provider);
    freelancerSigner = new hre.ethers.Wallet(freelancerPk, provider);
  } else if (signers && signers.length >= 3) {
    // Local demo fallback (not intended for live Polygon).
    clientSigner = signers[1];
    freelancerSigner = signers[2];
  } else {
    throw new Error(
      "No role wallets available.\n" +
        'Set CLIENT_PRIVATE_KEY and FREELANCER_PRIVATE_KEY in `.env` for Polygon Amoy deployment.\n' +
        "Alternatively, run against Hardhat localhost where multiple accounts exist."
    );
  }

  if (clientSigner.address === freelancerSigner.address) {
    throw new Error("client and freelancer must differ (contract requirement).");
  }

  const factory = await hre.ethers.getContractAt("EscrowFactory", factoryAddress, deployerSigner);

  console.log("Creating escrow with:");
  console.log(`- client:     ${clientSigner.address}`);
  console.log(`- freelancer: ${freelancerSigner.address}`);
  console.log(`- amountWei: ${amountWei.toString()}`);
  console.log(`- workRef:    ${workReference}`);

  const tx = await factory.createEscrow(
    clientSigner.address,
    freelancerSigner.address,
    amountWei,
    gasOverrides
  );
  const receipt = await tx.wait();

  const ev = receipt.events && receipt.events.find((e) => e.event === "EscrowDeployed");
  if (!ev) {
    throw new Error("Could not find EscrowDeployed event in createEscrow transaction receipt.");
  }

  const escrowAddress = ev.args.escrow;
  console.log(`EscrowDeployed -> escrow: ${escrowAddress}`);

  const escrowAsClient = await hre.ethers.getContractAt("Escrow", escrowAddress, clientSigner);
  const escrowAsFreelancer = escrowAsClient.connect(freelancerSigner);

  console.log("depositFunds() from client...");
  await (await escrowAsClient.depositFunds({ value: amountWei, ...gasOverrides })).wait();

  console.log("submitWork() from freelancer...");
  await (await escrowAsFreelancer.submitWork(workReference, gasOverrides)).wait();

  if (action === "approve") {
    console.log("approveWork() from client...");
    await (await escrowAsClient.approveWork(gasOverrides)).wait();
  } else {
    console.log("rejectWork() from client...");
    await (await escrowAsClient.rejectWork(gasOverrides)).wait();
  }

  const status = await escrowAsClient.status();
  console.log(`Done. Escrow status: ${status.toString()} (0=Created,1=Funded,2=Completed,3=Approved,4=Refunded)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

