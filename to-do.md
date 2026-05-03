# To-do list

**Last updated:** after factory + access control + tests + CI were added in-repo.

---

## Already done in this repository (you can skim or skip)

These are implemented and covered by tests / docs unless noted:

- [x] **Hardhat project**: compile, test, deploy scripts, `.env.example`, `.gitignore`.
- [x] **EscrowFactory**: one `Escrow` per `createEscrow`; **`EscrowDeployed`** event (`escrow`, `client`, `freelancer`, `amount`, `escrowId`); **`escrowCount`**.
- [x] **Restrict `Escrow.createEscrow`**: only the escrow’s **`factory`** address (set in constructor) can initialize once.
- [x] **Reentrancy guard**: OpenZeppelin **`ReentrancyGuard`** on **`approveWork`** and **`rejectWork`** (`nonReentrant`).
- [x] **Tests**: `test/Escrow.test.js` — factory + full escrow flows + factory-only init + 22 cases passing locally.
- [x] **Deploy script**: deploys **`EscrowFactory`** (`scripts/deploy.js`).
- [x] **README**: updated for factory-first workflow and class demo hints.
- [x] **CI**: GitHub Actions compiles and runs tests (`.github/workflows/ci.yml`).

---

## Your turn — class project checklist

Do these if your assignment asks for a “full” app or demo beyond the smart contracts.

### Environment (recommended)

- [ ] Use **Node.js 20 LTS** (or 18). Hardhat may warn on very new Node versions; LTS matches CI.
- [ ] After `git pull`, run `npm install` and **`npm test`** to confirm everything passes.

### Optional: Polygon testnet demo (no production pressure)

- [ ] Get **testnet POL** on **Polygon Amoy** (chain ID **80002**) from a [faucet](https://faucet.polygon.technology/).
- [ ] Create `.env` in the project root (same folder as `hardhat.config.js`) by copying `.env.example`.
- [ ] Fill it with non-empty `POLYGON_AMOY_RPC_URL` (or `AMOY_RPC_URL`) and `PRIVATE_KEY` (never commit `.env`).
- [x] Run `npm run deploy:amoy` and **save the factory address** (and any escrow addresses from `EscrowDeployed`) in your report or notes (deployed `EscrowFactory` to `0x73706e274c4745bFb4D583E0f0e1d543dC878790`).
- [ ] If you see `insufficient funds for intrinsic transaction cost`, top up the deployer account with more **test POL** on Polygon Amoy until it covers deployment gas (often ~0.2+ POL depending on gas price).

### Scripted end-to-end demo (Polygon Amoy)

- [ ] Add to your `.env`:
  `FACTORY_ADDRESS` (use the deployed factory address above), `CLIENT_PRIVATE_KEY`, `FREELANCER_PRIVATE_KEY`, `AMOUNT_ETH`, `WORK_REFERENCE`, `ACTION` (`approve` or `reject`).
- [ ] Fund both `CLIENT_PRIVATE_KEY` and `FREELANCER_PRIVATE_KEY` wallets with enough **test POL** to pay gas for their respective txs.
- [ ] Run the full flow: `npm run demo:amoy`

### Optional: Polygon mainnet (real POL)

- [ ] Only if required: set `POLYGON_RPC_URL` and fund the deployer with **POL**, then `npm run deploy:polygon`. For class work, **Amoy** is usually enough.

### Wallet / UI (makes it feel like a real app)

- [ ] **Pick one**: small **React** app, **Next.js** page, or **Remix** + MetaMask for the demo.
- [ ] Add **MetaMask** (or similar) on the **same chain** as your demo: **localhost**, **Polygon Amoy (80002)**, or **Polygon PoS (137)**.
- [ ] Wire transactions:
  - [ ] `EscrowFactory.createEscrow(client, freelancer, amountWei)`
  - [ ] On the new escrow: `depositFunds` (exact value), `submitWork`, `approveWork` / `rejectWork`
- [ ] Show **read-only** fields: status, amount, `workReference`, client, freelancer (from contract calls).
- [ ] Handle errors: wrong account, wrong network, user rejected tx, insufficient funds.

### Off-chain piece (often required for “deliverable” story)

- [ ] Upload a sample file to **IPFS** (Pinata, NFT.Storage, etc.) and paste the **CID** into `submitWork` so the link resolves for your write-up.

### Write-up (typical class submission)

- [ ] Short **sequence diagram** or numbered flow: factory → escrow → fund → submit → approve/refund.
- [ ] **Screenshots** of MetaMask / UI or Remix transactions.
- [ ] 1 paragraph on **limitations** (native **POL** on Polygon for this escrow, no milestones, no arbitration, client can stall after `Completed` unless you add deadlines later).

---

## Stretch ideas (only if required / you want extra credit)

- [ ] **Deadlines**: auto-refund or auto-release after a timestamp (requires contract changes + new tests).
- [ ] **ERC-20** variant instead of native ETH (new contract or refactor + tests).
- [ ] **Milestones** or **dispute** role (design on paper first).
- [ ] **Slither** or static analysis in a dev container / Linux VM (`pip install slither-analyzer`, run from repo root).
- [ ] **Contract verify** on a block explorer (Hardhat verify plugin + API key) — nice for portfolio, not required for class.

---

## Quick MVP for class (working demo)

You’re in good shape on-chain once tests pass. For a polished submission, aim for:

1. Record a **screen capture** or screenshots: create escrow → fund → submit CID → approve **or** reject.
2. Turn in the **factory address** (testnet or local) and **one escrow address** from `EscrowDeployed`.
3. Point to **`EscrowDeployed`** / **`FundsDeposited`** events in a block explorer or Hardhat console output.
