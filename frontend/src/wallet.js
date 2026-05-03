import { BrowserProvider } from "ethers";
import { CHAIN_META } from "./chains.js";

export function getEthereum() {
  return typeof window !== "undefined" ? window.ethereum : null;
}

export async function connectWallet() {
  const eth = getEthereum();
  if (!eth) {
    throw new Error("No wallet found. Install MetaMask (or another injected wallet).");
  }
  await eth.request({ method: "eth_requestAccounts" });
  return new BrowserProvider(eth);
}

/**
 * Revokes dapp access so the next connect can prompt again (MetaMask / EIP-2255).
 * Safe to call if unsupported — returns false.
 */
export async function revokeWalletAccess() {
  const eth = getEthereum();
  if (!eth?.request) return false;
  try {
    await eth.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
    return true;
  } catch {
    return false;
  }
}

export async function ensureChain(targetChainId) {
  const eth = getEthereum();
  if (!eth) throw new Error("No wallet found.");
  const meta = CHAIN_META[targetChainId];
  if (!meta) throw new Error(`Unsupported chain ID: ${targetChainId}`);

  const chainHex = meta.chainIdHex;
  const current = await eth.request({ method: "eth_chainId" });
  if (current.toLowerCase() === chainHex.toLowerCase()) return;

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }],
    });
  } catch (e) {
    if (e?.code === 4902 || e?.code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainHex,
            chainName: meta.chainName,
            nativeCurrency: meta.nativeCurrency,
            rpcUrls: meta.rpcUrls,
            blockExplorerUrls: meta.blockExplorerUrls,
          },
        ],
      });
      return;
    }
    throw e;
  }
}
