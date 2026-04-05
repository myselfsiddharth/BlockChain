import { parseUnits } from "ethers";

/**
 * Polygon Amoy rejects txs when maxPriorityFeePerGas is below this (per RPC error).
 * We use exactly this floor — not higher — so fees stay as low as the chain allows.
 */
const AMOY_MIN_PRIORITY_WEI = 25_000_000_000n; // 25 gwei

/**
 * @param {import("ethers").Provider} provider
 * @param {number} chainId
 */
export async function getEip1559GasOverrides(provider, chainId) {
  if (chainId === 80002) {
    const fee = await provider.getFeeData().catch(() => null);

    let maxPriorityFeePerGas = fee?.maxPriorityFeePerGas ?? AMOY_MIN_PRIORITY_WEI;
    if (maxPriorityFeePerGas < AMOY_MIN_PRIORITY_WEI) {
      maxPriorityFeePerGas = AMOY_MIN_PRIORITY_WEI;
    }

    const block = await provider.getBlock("latest").catch(() => null);
    const base = block?.baseFeePerGas ?? 0n;

    let maxFeePerGas;
    if (base > 0n) {
      // Standard EIP-1559 headroom: tolerate one base-fee spike (2× base + tip).
      maxFeePerGas = 2n * base + maxPriorityFeePerGas;
    } else {
      maxFeePerGas = maxPriorityFeePerGas + parseUnits("10", "gwei");
    }

    const floor = base > 0n ? base + maxPriorityFeePerGas : maxPriorityFeePerGas;
    if (maxFeePerGas < floor) maxFeePerGas = floor;

    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  const fee = await provider.getFeeData().catch(() => null);
  return {
    maxPriorityFeePerGas:
      fee?.maxPriorityFeePerGas ?? parseUnits("1", "gwei"),
    maxFeePerGas: fee?.maxFeePerGas ?? parseUnits("40", "gwei"),
  };
}

/**
 * Sets EIP-1559 fees plus a sane gasLimit from eth_estimateGas (avoids wallets
 * using huge defaults like 50M gas when estimation path is odd).
 *
 * @param {import("ethers").Provider} provider
 * @param {number} chainId
 * @param {(feeHints: object) => Promise<bigint>} estimateFn
 * @param {{ cap?: bigint, fallback?: bigint, floor?: bigint }} [opts]
 */
export async function finalizeGasOverrides(
  provider,
  chainId,
  estimateFn,
  opts = {}
) {
  const {
    cap = 4_500_000n,
    fallback = 3_200_000n,
    floor = 400_000n,
  } = opts;

  const fees = await getEip1559GasOverrides(provider, chainId);
  const feeHints = {
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
  };

  let gasLimit;
  try {
    const est = await estimateFn(feeHints);
    gasLimit = est + est / 4n + 25_000n;
    if (gasLimit > cap) gasLimit = cap;
    if (gasLimit < floor) gasLimit = floor;
  } catch {
    gasLimit = fallback;
  }

  return { ...fees, gasLimit };
}
