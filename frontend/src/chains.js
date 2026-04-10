/** Polygon Amoy — the only network this UI supports. */

export const CHAIN_META = {
  80002: {
    chainIdHex: "0x13882",
    chainName: "Polygon Amoy",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://rpc-amoy.polygon.technology"],
    blockExplorerUrls: ["https://amoy.polygonscan.com"],
  },
};

export function explorerTxUrl(chainId, txHash) {
  const meta = CHAIN_META[chainId];
  if (!meta?.blockExplorerUrls?.[0]) return null;
  return `${meta.blockExplorerUrls[0]}/tx/${txHash}`;
}
