async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchGroupsByMember(address: string) {
  return get<Array<{ groupId: number; owner: string; groupName: string; description: string; created: number; isOpen: boolean; memberCount: number }>>(`/groups/member/${address}`);
}

export async function fetchFirstTxTimestamp(address: string): Promise<number | null> {
  try {
    const txs = await get<Array<{ timestamp: number }>>(`/transactions/search?address=${address}&limit=1&reverse=false&confirmationStatus=CONFIRMED`);
    return txs?.[0]?.timestamp ?? null;
  } catch { return null; }
}

// limit=500 instead of 0 — Qortal treats limit=0 as "return 0 rows", not "return all"
export async function fetchQdnResourceCount(name: string): Promise<number> {
  try {
    const resources = await get<unknown[]>(`/arbitrary/resources?name=${encodeURIComponent(name)}&limit=500&includeStatus=false`);
    return Array.isArray(resources) ? resources.length : 0;
  } catch { return 0; }
}

export async function fetchRewardShareCount(address: string): Promise<number> {
  try {
    const shares = await get<unknown[]>(`/rewardshares?minter=${address}&limit=50`);
    return Array.isArray(shares) ? shares.length : 0;
  } catch { return 0; }
}

export async function fetchRecentActivityCount(address: string): Promise<number> {
  try {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const txs = await get<Array<{ timestamp: number }>>(`/transactions/search?address=${address}&confirmationStatus=CONFIRMED&limit=50&reverse=true`);
    return txs.filter(tx => tx.timestamp > cutoff).length;
  } catch { return 0; }
}

export async function fetchNamesForSale(query: string, limit = 20): Promise<Array<{ name: string; owner: string; salePrice: number }>> {
  try {
    const qs = query ? `&query=${encodeURIComponent(query)}` : '';
    return get<Array<{ name: string; owner: string; salePrice: number }>>(`/names/forsale?limit=${limit}${qs}`);
  } catch { return []; }
}
