/** Polygon networks supported by the UI */

export const CHAIN_META = {
  80002: {
    chainIdHex: "0x13882",
    chainName: "Polygon Amoy",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://rpc-amoy.polygon.technology"],
    blockExplorerUrls: ["https://amoy.polygonscan.com"],
  },
  137: {
    chainIdHex: "0x89",
    chainName: "Polygon PoS",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
};

export function explorerTxUrl(chainId, txHash) {
  const meta = CHAIN_META[chainId];
  if (!meta?.blockExplorerUrls?.[0]) return null;
  return `${meta.blockExplorerUrls[0]}/tx/${txHash}`;
}
