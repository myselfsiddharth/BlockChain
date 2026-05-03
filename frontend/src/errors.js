/**
 * MetaMask / RPC often return shapes ethers maps to "could not coalesce error".
 * Pull nested messages so users see the real cause.
 */
export function formatContractError(err) {
  if (!err) return "Unknown error.";

  const parts = [];
  const add = (s) => {
    if (s == null) return;
    const t = String(s).trim();
    if (t && !parts.includes(t)) parts.push(t);
  };

  add(err.shortMessage);
  add(err.reason);
  add(err.message);

  const walk = (obj, depth = 0) => {
    if (obj == null || depth > 6) return;
    if (typeof obj === "string") {
      add(obj);
      return;
    }
    if (typeof obj !== "object") return;
    add(obj.message);
    add(obj.reason);
    if (obj.data != null) {
      if (typeof obj.data === "string") add(obj.data);
      else if (obj.data?.message) add(obj.data.message);
    }
    if (obj.error) walk(obj.error, depth + 1);
    if (obj.body) walk(obj.body, depth + 1);
    if (obj.info) walk(obj.info, depth + 1);
  };

  walk(err.info);
  walk(err.cause);

  if (parts.length === 0)
    return "Transaction failed. Check: Polygon network matches the UI, factory address is correct, and you have POL for gas.";

  const joined = parts.join(" — ");

  if (/insufficient funds/i.test(joined)) {
    return (
      "Not enough POL in this wallet to pay gas. “Create escrow” deploys a new contract, so it uses more gas than a simple transfer — try a Polygon Amoy faucet. " +
      "The escrow amount (e.g. 0.001 POL) is separate: it is only sent when the client clicks Deposit. " +
      "(Errors that mention “missing revert data” are often this same issue.)"
    );
  }

  return joined;
}
