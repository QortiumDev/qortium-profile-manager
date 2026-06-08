export interface QortalAccount {
  address: string;
  publicKey: string;
  level: number;
  blocksMinted: number;
  blocksMintedAdjustment: number;
  blocksMintedPenalty: number;
  flags: number;
}

export interface QortalName {
  name: string;
  owner: string;
  registrationTimestamp: number;
  updated?: number;
  isForSale?: boolean;
  description?: string;
}

export interface QortalGroup {
  groupId: number;
  owner: string;
  groupName: string;
  description: string;
  created: number;
  isOpen: boolean;
  memberCount: number;
}

export interface DashboardStats {
  account: QortalAccount | null;
  names: QortalName[];
  groups: QortalGroup[];
  balance: number | null;
  firstTxTimestamp: number | null;
  qdnResourceCount: number;
}

export enum EnumTheme {
  DARK = 'dark',
  LIGHT = 'light',
}
