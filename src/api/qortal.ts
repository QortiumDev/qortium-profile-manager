function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(',')[1] ?? ''); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('canvas resize failed'))),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

export async function getUserAccount(): Promise<{ address: string; name: string | null }> {
  const res = await qdnRequest({ action: 'GET_SELECTED_ACCOUNT' }) as { address: string; name: string | null };
  return { address: res.address, name: res.name || null };
}

export async function registerName(name: string): Promise<void> {
  await qdnRequest({ action: 'REGISTER_NAME', name });
}

export async function updateName(oldName: string, newName: string): Promise<void> {
  await qdnRequest({ action: 'UPDATE_NAME', name: oldName, newName });
}

export async function updateNameDescription(name: string, description: string): Promise<void> {
  await qdnRequest({ action: 'UPDATE_NAME', name, newData: description });
}

export async function sellName(name: string, amount: number): Promise<void> {
  await qdnRequest({ action: 'SELL_NAME', name, amount });
}

export async function cancelSellName(name: string): Promise<void> {
  await qdnRequest({ action: 'CANCEL_SELL_NAME', name });
}

export async function buyName(name: string): Promise<void> {
  await qdnRequest({ action: 'BUY_NAME', name });
}

export async function getAccountNames(address: string): Promise<Array<{ name: string; owner: string; description?: string; registrationTimestamp: number; isForSale?: boolean; salePrice?: number }>> {
  try {
    const res = await qdnRequest({ action: 'GET_ACCOUNT_NAMES', address }) as Array<{ name: string; owner: string; description?: string; registrationTimestamp: number; isForSale?: boolean; salePrice?: number }>;
    return res ?? [];
  } catch { return []; }
}

export async function getNameData(name: string): Promise<{ name: string; owner: string; description?: string; registrationTimestamp: number; isForSale?: boolean; salePrice?: number } | null> {
  try {
    return await qdnRequest({ action: 'GET_NAME_DATA', name }) as { name: string; owner: string; description?: string; registrationTimestamp: number; isForSale?: boolean; salePrice?: number };
  } catch { return null; }
}

export async function searchNames(query: string): Promise<Array<{ name: string; owner: string }>> {
  try {
    const res = await qdnRequest({
      action: 'FETCH_NODE_API',
      path: `/names/search?query=${encodeURIComponent(query)}&prefix=true&limit=20`,
    }) as { data: Array<{ name: string; owner: string }> };
    return res?.data ?? [];
  } catch { return []; }
}

export async function getAccountData(address: string): Promise<import('../types').QortalAccount | null> {
  try {
    return await qdnRequest({ action: 'GET_ACCOUNT_DATA', address }) as import('../types').QortalAccount;
  } catch { return null; }
}

export async function getBalance(address: string): Promise<number | null> {
  try {
    return await qdnRequest({ action: 'GET_BALANCE', address }) as number;
  } catch { return null; }
}

export async function fetchBio(name: string): Promise<string | null> {
  try {
    const res = await qdnRequest({ action: 'FETCH_QDN_RESOURCE', service: 'DOCUMENT', name, identifier: 'bio', encoding: 'base64' }) as string;
    return decodeURIComponent(escape(atob(res)));
  } catch { return null; }
}

export async function publishBio(name: string, bio: string): Promise<void> {
  await qdnRequest({ action: 'PUBLISH_QDN_RESOURCE', service: 'DOCUMENT', identifier: 'bio', name, data64: btoa(unescape(encodeURIComponent(bio))) });
}

export async function fetchStatus(name: string): Promise<string | null> {
  try {
    const res = await qdnRequest({ action: 'FETCH_QDN_RESOURCE', service: 'DOCUMENT', name, identifier: 'status', encoding: 'base64' }) as string;
    return decodeURIComponent(escape(atob(res)));
  } catch { return null; }
}

export async function publishStatus(name: string, status: string): Promise<void> {
  await qdnRequest({ action: 'PUBLISH_QDN_RESOURCE', service: 'DOCUMENT', identifier: 'status', name, data64: btoa(unescape(encodeURIComponent(status))) });
}

export async function publishAvatar(name: string, file: File): Promise<void> {
  const toUpload = file.type === 'image/gif' ? file : await resizeImage(file, 800, 0.85);
  await qdnRequest({ action: 'PUBLISH_QDN_RESOURCE', service: 'THUMBNAIL', identifier: 'avatar', name, data64: await fileToBase64(toUpload) });
}

export async function fetchFriends(name: string): Promise<string[]> {
  try {
    const res = await qdnRequest({ action: 'FETCH_QDN_RESOURCE', service: 'DOCUMENT', name, identifier: 'friends', encoding: 'base64' }) as string;
    const parsed: unknown = JSON.parse(decodeURIComponent(escape(atob(res))));
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

export async function publishFriends(name: string, friends: string[]): Promise<void> {
  await qdnRequest({ action: 'PUBLISH_QDN_RESOURCE', service: 'DOCUMENT', identifier: 'friends', name, data64: btoa(unescape(encodeURIComponent(JSON.stringify(friends)))) });
}
