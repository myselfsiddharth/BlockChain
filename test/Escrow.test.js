const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow (via EscrowFactory)", function () {
  async function deployFactoryFixture() {
    const [deployer, client, freelancer, stranger] = await ethers.getSigners();
    const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
    const factory = await EscrowFactory.deploy();
    await factory.deployed();

    const amount = ethers.utils.parseEther("1");
    return { factory, deployer, client, freelancer, stranger, amount };
  }

  async function createEscrowInstance(factory, client, freelancer, amount) {
    const tx = await factory.createEscrow(client.address, freelancer.address, amount);
    const receipt = await tx.wait();
    const ev = receipt.events.find((e) => e.event === "EscrowDeployed");
    expect(ev).to.not.equal(undefined);
    return ethers.getContractAt("Escrow", ev.args.escrow);
  }

  async function setupFundedEscrow() {
    const fixture = await deployFactoryFixture();
    const { factory, client, freelancer, amount } = fixture;
    const escrow = await createEscrowInstance(factory, client, freelancer, amount);
    await escrow.connect(client).depositFunds({ value: amount });
    return { ...fixture, escrow };
  }

  async function setupCompletedEscrow() {
    const fixture = await setupFundedEscrow();
    const { escrow, freelancer } = fixture;
    await escrow.connect(freelancer).submitWork("ipfs://work-proof-cid");
    return fixture;
  }

  describe("EscrowFactory", function () {
    it("deploys escrow, initializes it, increments count, emits event", async function () {
      const { factory, client, freelancer, amount } = await deployFactoryFixture();

      const tx = await factory.createEscrow(client.address, freelancer.address, amount);
      await expect(tx).to.emit(factory, "EscrowDeployed");

      const receipt = await tx.wait();
      const ev = receipt.events.find((e) => e.event === "EscrowDeployed");
      expect(ev).to.not.equal(undefined);
      expect(ethers.utils.isAddress(ev.args.escrow)).to.equal(true);
      expect(ev.args.client).to.equal(client.address);
      expect(ev.args.freelancer).to.equal(freelancer.address);
      expect(ev.args.amount).to.equal(amount);
      expect(ev.args.escrowId).to.equal(1);

      expect(await factory.escrowCount()).to.equal(1);
    });
  });

  describe("createEscrow", function () {
    it("initializes escrow with valid inputs", async function () {
      const { factory, client, freelancer, amount } = await deployFactoryFixture();
      const escrow = await createEscrowInstance(factory, client, freelancer, amount);

      expect(await escrow.client()).to.equal(client.address);
      expect(await escrow.freelancer()).to.equal(freelancer.address);
      expect(await escrow.amount()).to.equal(amount);
      expect(await escrow.status()).to.equal(0); // Created
      expect(await escrow.factory()).to.equal(factory.address);
    });

    it("reverts on zero client address", async function () {
      const { factory, freelancer, amount } = await deployFactoryFixture();
      await expect(
        factory.createEscrow(ethers.constants.AddressZero, freelancer.address, amount)
      ).to.be.revertedWith("Invalid client address");
    });

    it("reverts on zero freelancer address", async function () {
      const { factory, client, amount } = await deployFactoryFixture();
      await expect(
        factory.createEscrow(client.address, ethers.constants.AddressZero, amount)
      ).to.be.revertedWith("Invalid freelancer address");
    });

    it("reverts when client and freelancer are same", async function () {
      const { factory, client, amount } = await deployFactoryFixture();
      await expect(
        factory.createEscrow(client.address, client.address, amount)
      ).to.be.revertedWith("Client and freelancer must differ");
    });

    it("reverts when amount is zero", async function () {
      const { factory, client, freelancer } = await deployFactoryFixture();
      await expect(
        factory.createEscrow(client.address, freelancer.address, 0)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("reverts when non-factory tries createEscrow on Escrow", async function () {
      const { deployer, stranger, client, freelancer, amount } = await deployFactoryFixture();
      const Escrow = await ethers.getContractFactory("Escrow");
      const escrow = await Escrow.deploy(deployer.address);
      await escrow.deployed();

      await expect(
        escrow.connect(stranger).createEscrow(client.address, freelancer.address, amount)
      ).to.be.revertedWith("Only factory can initialize");
    });

    it("reverts when createEscrow is called a second time on same Escrow", async function () {
      const { factory, deployer, client, freelancer, amount } = await deployFactoryFixture();
      const Escrow = await ethers.getContractFactory("Escrow");
      const escrow = await Escrow.deploy(deployer.address);
      await escrow.deployed();
      await escrow.connect(deployer).createEscrow(client.address, freelancer.address, amount);

      await expect(
        escrow.connect(deployer).createEscrow(client.address, freelancer.address, amount)
      ).to.be.revertedWith("Escrow already initialized");
    });
  });

  describe("depositFunds", function () {
    it("allows only the client to deposit exact amount and emits event", async function () {
      const { factory, client, freelancer, amount } = await deployFactoryFixture();
      const escrow = await createEscrowInstance(factory, client, freelancer, amount);

      await expect(escrow.connect(client).depositFunds({ value: amount }))
        .to.emit(escrow, "FundsDeposited")
        .withArgs(client.address, amount);

      expect(await escrow.status()).to.equal(1); // Funded
    });

    it("reverts when non-client tries to deposit", async function () {
      const { factory, client, freelancer, stranger, amount } = await deployFactoryFixture();
      const escrow = await createEscrowInstance(factory, client, freelancer, amount);

      await expect(
        escrow.connect(stranger).depositFunds({ value: amount })
      ).to.be.revertedWith("Only client can call this");
    });

    it("reverts when deposit does not match agreed amount", async function () {
      const { factory, client, freelancer, amount } = await deployFactoryFixture();
      const escrow = await createEscrowInstance(factory, client, freelancer, amount);

      await expect(
        escrow.connect(client).depositFunds({ value: amount.sub(1) })
      ).to.be.revertedWith("Deposit must match agreed amount");
    });

    it("reverts when called outside Created state", async function () {
      const { escrow, client, amount } = await setupFundedEscrow();
      await expect(
        escrow.connect(client).depositFunds({ value: amount })
      ).to.be.revertedWith("Invalid status for this action");
    });
  });

  describe("submitWork", function () {
    it("allows freelancer submission after funding and emits event", async function () {
      const { escrow, freelancer } = await setupFundedEscrow();

      await expect(escrow.connect(freelancer).submitWork("ipfs://work-proof-cid"))
        .to.emit(escrow, "WorkSubmitted")
        .withArgs(freelancer.address, "ipfs://work-proof-cid");

      expect(await escrow.status()).to.equal(2); // Completed
      expect(await escrow.workReference()).to.equal("ipfs://work-proof-cid");
    });

    it("reverts when non-freelancer submits work", async function () {
      const { escrow, client } = await setupFundedEscrow();
      await expect(
        escrow.connect(client).submitWork("ipfs://work-proof-cid")
      ).to.be.revertedWith("Only freelancer can call this");
    });

    it("reverts for empty work reference", async function () {
      const { escrow, freelancer } = await setupFundedEscrow();
      await expect(escrow.connect(freelancer).submitWork("")).to.be.revertedWith(
        "Work reference is required"
      );
    });

    it("reverts when called before funds are deposited", async function () {
      const { factory, client, freelancer, amount } = await deployFactoryFixture();
      const escrow = await createEscrowInstance(factory, client, freelancer, amount);
      await expect(
        escrow.connect(freelancer).submitWork("ipfs://work-proof-cid")
      ).to.be.revertedWith("Invalid status for this action");
    });
  });

  describe("approveWork", function () {
    it("releases funds to freelancer and emits event", async function () {
      const { escrow, client, freelancer, amount } = await setupCompletedEscrow();
      const before = await ethers.provider.getBalance(freelancer.address);

      const tx = await escrow.connect(client).approveWork();
      await expect(tx).to.emit(escrow, "FundsReleased").withArgs(freelancer.address, amount);

      const after = await ethers.provider.getBalance(freelancer.address);
      expect(after.sub(before)).to.equal(amount);
      expect(await escrow.status()).to.equal(3); // Approved
    });

    it("reverts when non-client tries to approve", async function () {
      const { escrow, freelancer } = await setupCompletedEscrow();
      await expect(escrow.connect(freelancer).approveWork()).to.be.revertedWith(
        "Only client can call this"
      );
    });

    it("reverts when called before completion", async function () {
      const { escrow, client } = await setupFundedEscrow();
      await expect(escrow.connect(client).approveWork()).to.be.revertedWith("Invalid status for this action");
    });
  });

  describe("rejectWork", function () {
    it("refunds funds to client and emits event", async function () {
      const { escrow, client, amount } = await setupCompletedEscrow();
      const before = await ethers.provider.getBalance(client.address);

      const tx = await escrow.connect(client).rejectWork();
      const receipt = await tx.wait();
      const gasPrice = receipt.effectiveGasPrice || tx.gasPrice;
      const gasCost = receipt.gasUsed.mul(gasPrice);

      await expect(tx).to.emit(escrow, "FundsRefunded").withArgs(client.address, amount);

      const after = await ethers.provider.getBalance(client.address);
      expect(after.sub(before).add(gasCost)).to.equal(amount);
      expect(await escrow.status()).to.equal(4); // Refunded
    });

    it("reverts when non-client tries to reject", async function () {
      const { escrow, freelancer } = await setupCompletedEscrow();
      await expect(escrow.connect(freelancer).rejectWork()).to.be.revertedWith(
        "Only client can call this"
      );
    });

    it("reverts when called before completion", async function () {
      const { escrow, client } = await setupFundedEscrow();
      await expect(escrow.connect(client).rejectWork()).to.be.revertedWith("Invalid status for this action");
    });
  });
});
