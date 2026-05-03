const SESSION_KEY = "polygon-escrow-auth-v1";

/**
 * @returns {{
 *   version: number;
 *   address: string;
 *   chainId: number;
 *   message: string;
 *   signature: string;
 * } | null}
 */
export function loadAuthSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || o.version !== 1 || typeof o.address !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   address: string;
 *   chainId: number;
 *   message: string;
 *   signature: string;
 * }} data
 */
export function saveAuthSession(data) {
  const payload = {
    version: 1,
    address: data.address,
    chainId: data.chainId,
    message: data.message,
    signature: data.signature,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function clearAuthSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function buildLoginMessage(address, chainId) {
  const issued = new Date().toISOString();
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  const nonce =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `Polygon Escrow wants you to sign in with your Ethereum account.

Address: ${address}
Chain ID: ${chainId}
Issued: ${issued}
URI: ${origin}
Nonce: ${nonce}`;
}
