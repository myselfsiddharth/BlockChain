const STORAGE_KEY = "polygon-escrow-ui-v2";

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return typeof o === "object" && o !== null ? o : {};
  } catch {
    return {};
  }
}

export function savePrefs(partial) {
  try {
    const cur = loadPrefs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...partial }));
  } catch {
    /* ignore quota / private mode */
  }
}

/** @param {string} escrowAddr */
export function rememberRecentEscrow(escrowAddr, max = 8) {
  const a = escrowAddr.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) return;
  const cur = loadPrefs();
  const list = Array.isArray(cur.recentEscrows) ? cur.recentEscrows : [];
  const next = [a, ...list.filter((x) => x !== a)].slice(0, max);
  savePrefs({ recentEscrows: next });
}

export function getRecentEscrows() {
  const cur = loadPrefs();
  return Array.isArray(cur.recentEscrows) ? cur.recentEscrows : [];
}
