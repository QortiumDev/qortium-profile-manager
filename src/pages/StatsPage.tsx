import { useEffect, useState } from 'react';
import { Box, CircularProgress, MenuItem, Select, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import BadgeIcon from '@mui/icons-material/Badge';
import StorageIcon from '@mui/icons-material/Storage';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import StarsIcon from '@mui/icons-material/Stars';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HardwareIcon from '@mui/icons-material/Hardware';
import ShareIcon from '@mui/icons-material/Share';
import BoltIcon from '@mui/icons-material/Bolt';
import { useAtomValue } from 'jotai';
import { useColors } from '../theme/ColorTokensContext';
import { StatCard } from '../components/dashboard/StatCard';
import { accountAtom, accountLoadingAtom, uiStyleAtom } from '../state/atoms';
import { getAccountNames } from '../api/qortal';
import { useAccountStats } from '../hooks/useAccountStats';
import type { QortalName } from '../types';
import { appLabel, openApp } from '../apps';

function formatMintingTime(blocks: number) {
  const h = blocks / 60;
  if (h < 48) return `~${Math.round(h)}h minting time`;
  const d = Math.floor(h / 24);
  const rem = Math.floor(h % 24);
  return rem > 0 ? `~${d}d ${rem}h minting time` : `~${d}d minting time`;
}

function formatAge(ts: number | null) {
  if (!ts) return '—';
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days < 30) return `${days}d`;
  const mo = Math.floor(days / 30);
  return mo < 24 ? `${mo}mo` : `${Math.floor(mo / 12)}yr ${mo % 12}mo`;
}

export function StatsPage() {
  const c = useColors();
  const account = useAtomValue(accountAtom);
  const accountLoading = useAtomValue(accountLoadingAtom);
  const uiStyle = useAtomValue(uiStyleAtom);
  const isClassic = uiStyle === 'classic';
  const pagePt = 'calc(var(--profile-top-bar-height, 52px) + 24px)';
  const pageMaxWidth = c.layoutWideMaxWidth;

  const [ownNames, setOwnNames] = useState<QortalName[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [namesLoading, setNamesLoading] = useState(true);

  useEffect(() => {
    if (!account) return;
    setNamesLoading(true);
    getAccountNames(account.address).then(names => {
      setOwnNames(names);
      setSelectedName(names[0]?.name ?? null);
      setNamesLoading(false);
    });
  }, [account]);

  const stats = useAccountStats(account?.address ?? null, selectedName);

  if (accountLoading || namesLoading) {
    return (
      <Box sx={{ pt: pagePt, display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} sx={{ color: c.accent }} />
      </Box>
    );
  }

  if (!account) {
    return (
      <Box sx={{ pt: pagePt, textAlign: 'center', py: 8 }}>
        <Typography sx={{ color: c.textSecondary, fontSize: '0.9rem' }}>Could not connect to your account.</Typography>
      </Box>
    );
  }

  const level = stats.acct.value?.level ?? 0;
  const blocksMinted = stats.acct.value
    ? stats.acct.value.blocksMinted + (stats.acct.value.blocksMintedAdjustment ?? 0) - (stats.acct.value.blocksMintedPenalty ?? 0)
    : 0;
  const isMinting = stats.acct.value ? (stats.acct.value.flags & 1) !== 0 : false;
  const qdnDisplay = stats.qdnCount.value >= 500 ? '500+' : String(stats.qdnCount.value);
  const rewardDisplay = stats.rewardShares.value >= 50 ? '50+' : String(stats.rewardShares.value);
  const actDisplay = stats.activity.value >= 50 ? '50+' : String(stats.activity.value);

  return (
    <Box sx={{ pt: pagePt, pb: 4, px: { xs: isClassic ? 1.5 : 2, md: isClassic ? 3 : 4 }, maxWidth: pageMaxWidth, mx: 'auto' }}>
      {ownNames.length > 1 && (
        <Select
          size="small"
          value={selectedName ?? ''}
          onChange={e => setSelectedName(e.target.value)}
          sx={{ fontSize: '0.85rem', mb: 2 }}
        >
          {ownNames.map(n => <MenuItem key={n.name} value={n.name} sx={{ fontSize: '0.85rem' }}>{n.name}</MenuItem>)}
        </Select>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
        <StatCard label="Minting Level" value={level} loading={stats.acct.loading} accent
          sub={`Level ${level}${isMinting ? ' · Minting' : ''}`}
          icon={<StarsIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${account.address}`)}
          actionLabel={appLabel('chain')}
        />
        <StatCard label="Blocks Minted" value={blocksMinted.toLocaleString()} loading={stats.acct.loading}
          sub={stats.acct.value ? [formatMintingTime(blocksMinted), stats.acct.value.blocksMintedPenalty ? `−${stats.acct.value.blocksMintedPenalty.toLocaleString()} penalty` : null].filter(Boolean).join(' · ') : undefined}
          icon={<HardwareIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${account.address}`)}
          actionLabel={appLabel('chain')}
        />
        <StatCard label="Account Age" value={formatAge(stats.firstTx.value)} loading={stats.firstTx.loading}
          sub={stats.firstTx.value ? new Date(stats.firstTx.value).toLocaleDateString() : 'No transactions'}
          icon={<CalendarTodayIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${account.address}`)}
          actionLabel={appLabel('chain')}
        />
        <StatCard label="Groups" value={stats.groups.value.length} loading={stats.groups.loading}
          sub={`${stats.groups.value.length} joined`}
          icon={<GroupsIcon fontSize="inherit" />}
          onAction={() => void openApp('groups')}
          actionLabel={appLabel('groups')}
        />
        <StatCard label="Names" value={stats.statNames.value.length} loading={stats.statNames.loading}
          sub={`${stats.statNames.value.length} registered`}
          icon={<BadgeIcon fontSize="inherit" />}
          onAction={selectedName ? () => void openApp('names', `/name/${selectedName}`) : undefined}
          actionLabel={selectedName ? appLabel('names') : undefined}
        />
        <StatCard label="QDN Resources" value={qdnDisplay} loading={stats.qdnCount.loading}
          sub="published data"
          icon={<StorageIcon fontSize="inherit" />}
          onAction={selectedName ? () => void openApp('chain', `/name/${selectedName}`) : undefined}
          actionLabel={selectedName ? appLabel('chain') : undefined}
        />
        <StatCard label="Balance" loading={stats.bal.loading}
          value={stats.bal.value !== null ? stats.bal.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
          sub="QORT · native coin"
          icon={<AccountBalanceWalletIcon fontSize="inherit" />}
          onAction={() => void openApp('wallet', '/qortal')}
          actionLabel={appLabel('wallet')}
        />
        <StatCard label="Reward Shares" value={rewardDisplay} loading={stats.rewardShares.loading}
          sub="minting relationships"
          icon={<ShareIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${account.address}`)}
          actionLabel={appLabel('chain')}
        />
        <StatCard label="Recent Activity" value={actDisplay} loading={stats.activity.loading}
          sub="transactions (30 days)"
          icon={<BoltIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${account.address}`)}
          actionLabel={appLabel('chain')}
        />
      </Box>
    </Box>
  );
}
