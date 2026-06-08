import { appLink } from '../apps';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(',')[1] ?? ''); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getUserAccount(): Promise<{ address: string; name: string | null; publicKey: string }> {
  const res = await qortalRequest({ action: 'GET_USER_ACCOUNT' }) as { address: string; name: string; publicKey: string };
  return { ...res, name: res.name || null };
}

export async function registerName(name: string): Promise<void> {
  await qortalRequest({ action: 'REGISTER_NAME', name });
}

export async function updateName(oldName: string, newName: string): Promise<void> {
  await qortalRequest({ action: 'UPDATE_NAME', oldName, newName });
}

export async function updateNameDescription(name: string, description: string): Promise<void> {
  await qortalRequest({ action: 'UPDATE_NAME', oldName: name, newName: name, description });
}

export async function sellName(nameForSale: string, salePrice: number): Promise<void> {
  await qortalRequest({ action: 'SELL_NAME', nameForSale, salePrice });
}

export async function cancelSellName(nameForSale: string): Promise<void> {
  await qortalRequest({ action: 'CANCEL_SELL_NAME', nameForSale });
}

export async function buyName(nameForSale: string): Promise<void> {
  await qortalRequest({ action: 'BUY_NAME', nameForSale });
}

export async function getAccountNames(address: string): Promise<Array<{ name: string; owner: string; description?: string; registrationTimestamp: number; isForSale?: boolean; salePrice?: number }>> {
  try {
    const res = await qortalRequest({ action: 'GET_ACCOUNT_NAMES', address }) as Array<{ name: string; owner: string; description?: string; registrationTimestamp: number; isForSale?: boolean; salePrice?: number }>;
    return res ?? [];
  } catch { return []; }
}

export async function getNameData(name: string): Promise<{ name: string; owner: string; description?: string; registrationTimestamp: number; isForSale?: boolean; salePrice?: number } | null> {
  try {
    return await qortalRequest({ action: 'GET_NAME_DATA', name }) as { name: string; owner: string; description?: string; registrationTimestamp: number; isForSale?: boolean; salePrice?: number };
  } catch { return null; }
}

export async function searchNames(query: string): Promise<Array<{ name: string; owner: string }>> {
  try {
    const res = await qortalRequest({ action: 'SEARCH_NAMES', query, prefix: true, limit: 20 }) as Array<{ name: string; owner: string }>;
    return res ?? [];
  } catch { return []; }
}

export async function getAccountData(address: string): Promise<import('../types').QortalAccount | null> {
  try {
    return await qortalRequest({ action: 'GET_ACCOUNT_DATA', address }) as import('../types').QortalAccount;
  } catch { return null; }
}

export async function getBalance(address: string): Promise<number | null> {
  try {
    return await qortalRequest({ action: 'GET_BALANCE', address }) as number;
  } catch { return null; }
}

export async function fetchBio(name: string): Promise<string | null> {
  try {
    const res = await qortalRequest({ action: 'FETCH_QDN_RESOURCE', service: 'DOCUMENT', name, identifier: 'profilium-bio', encoding: 'base64' }) as string;
    return decodeURIComponent(escape(atob(res)));
  } catch { return null; }
}

export async function publishBio(name: string, bio: string): Promise<void> {
  await qortalRequest({ action: 'PUBLISH_QDN_RESOURCE', service: 'DOCUMENT', identifier: 'profilium-bio', name, data64: btoa(unescape(encodeURIComponent(bio))) });
}

export async function fetchStatus(name: string): Promise<string | null> {
  try {
    const res = await qortalRequest({ action: 'FETCH_QDN_RESOURCE', service: 'DOCUMENT', name, identifier: 'profilium-status', encoding: 'base64' }) as string;
    return decodeURIComponent(escape(atob(res)));
  } catch { return null; }
}

export async function publishStatus(name: string, status: string): Promise<void> {
  await qortalRequest({ action: 'PUBLISH_QDN_RESOURCE', service: 'DOCUMENT', identifier: 'profilium-status', name, data64: btoa(unescape(encodeURIComponent(status))) });
}

export async function publishAvatar(name: string, file: File): Promise<void> {
  await qortalRequest({ action: 'PUBLISH_QDN_RESOURCE', service: 'THUMBNAIL', identifier: 'qortal_avatar', name, data64: await fileToBase64(file) });
}

export async function openInExplorer(name: string): Promise<void> {
  await qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('chain', `/#/address/${name}`) });
}
