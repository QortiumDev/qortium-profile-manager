import { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Button, CircularProgress, Collapse, IconButton, InputAdornment, TextField, Tooltip, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import BadgeIcon from '@mui/icons-material/Badge';
import StorageIcon from '@mui/icons-material/Storage';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import StarsIcon from '@mui/icons-material/Stars';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HardwareIcon from '@mui/icons-material/Hardware';
import ShareIcon from '@mui/icons-material/Share';
import BoltIcon from '@mui/icons-material/Bolt';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useAtomValue } from 'jotai';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { StatCard } from '../components/dashboard/StatCard';
import { AvatarDisplay } from '../components/profile/AvatarDisplay';
import { accountAtom } from '../state/atoms';
import { getAccountData, getBalance, getAccountNames, getNameData, fetchBio, fetchStatus, openInExplorer } from '../api/qortal';
import { appLink, appLabel } from '../apps';
import { fetchGroupsByMember, fetchFirstTxTimestamp, fetchQdnResourceCount, fetchRewardShareCount, fetchRecentActivityCount } from '../api/rest';
import type { QortalAccount, QortalGroup, QortalName } from '../types';

// LEVEL_LABELS — un-comment to restore named level display in the dashboard stat card
// const LEVEL_LABELS: Record<number, string> = {
//   0: 'Unregistered', 1: 'Initiate', 2: 'Member', 3: 'Full Member',
//   4: 'Minter', 5: 'Mentor', 6: 'Architect', 7: 'Senior Architect',
//   8: 'Elder', 9: 'Grand Elder', 10: 'Grand Elder',
// };

type S<T> = { loading: boolean; value: T };
const mk = <T,>(v: T): S<T> => ({ loading: true, value: v });

function BioPreview({ bio }: { bio: string }) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  return (
    <Box sx={{ mt: 0.25 }}>
      <Collapse in={expanded} collapsedSize={20}>
        <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {bio}
        </Typography>
      </Collapse>
      <Box
        onClick={() => setExpanded(e => !e)}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', color: c.accent, mt: 0.25, '&:hover': { opacity: 0.75 } }}
      >
        <Typography sx={{ fontSize: '0.7rem', fontWeight: tokens.typography.weightMedium }}>
          {expanded ? 'Show less' : 'Show bio'}
        </Typography>
        <KeyboardArrowDownIcon sx={{ fontSize: '0.9rem', transition: '0.15s ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </Box>
    </Box>
  );
}

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

function GroupList({ groups, onItemClick }: { groups: QortalGroup[]; onItemClick?: (g: QortalGroup) => void }) {
  const c = useColors();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {groups.map(g => (
        <Tooltip key={g.groupId} title={onItemClick ? `Open in ${appLabel('groups')}?` : ''} placement="right" arrow>
          <Box
            onClick={onItemClick ? () => onItemClick(g) : undefined}
            sx={{ display: 'flex', justifyContent: 'space-between', borderRadius: '4px', px: 0.5, mx: -0.5, cursor: onItemClick ? 'pointer' : 'default', '&:hover': onItemClick ? { bgcolor: c.borderLight } : {} }}
          >
            <Typography sx={{ fontSize: '0.82rem', color: c.textPrimary, fontWeight: tokens.typography.weightMedium }}>{g.groupName}</Typography>
            <Typography sx={{ fontSize: '0.7rem', color: c.textSecondary }}>{g.memberCount} members</Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}

function NameList({ names, onItemClick }: { names: QortalName[]; onItemClick?: (n: QortalName) => void }) {
  const c = useColors();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {names.map(n => (
        <Tooltip key={n.name} title={onItemClick ? `Open in ${appLabel('names')}?` : ''} placement="right" arrow>
          <Box
            onClick={onItemClick ? () => onItemClick(n) : undefined}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '4px', px: 0.5, mx: -0.5, cursor: onItemClick ? 'pointer' : 'default', '&:hover': onItemClick ? { bgcolor: c.borderLight } : {} }}
          >
            <Typography sx={{ fontSize: '0.82rem', color: c.textPrimary, fontWeight: tokens.typography.weightMedium }}>{n.name}</Typography>
            {n.description && <Typography sx={{ fontSize: '0.7rem', color: c.textSecondary, maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.description}</Typography>}
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}

interface Target { address: string; name: string | null }

export function DashboardPage() {
  const c = useColors();
  const ownAccount = useAtomValue(accountAtom);

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null); // null = own account

  // Per-stat state
  const [acct,         setAcct]         = useState(mk<QortalAccount | null>(null));
  const [bal,          setBal]           = useState(mk<number | null>(null));
  const [names,        setNames]         = useState(mk<QortalName[]>([]));
  const [groups,       setGroups]        = useState(mk<QortalGroup[]>([]));
  const [firstTx,      setFirstTx]       = useState(mk<number | null>(null));
  const [qdnCount,     setQdnCount]      = useState(mk<number>(0));
  const [rewardShares, setRewardShares]  = useState(mk<number>(0));
  const [activity,     setActivity]      = useState(mk<number>(0));

  // Viewed profile bio/status (for search view)
  const [viewBio,    setViewBio]    = useState<string | null>(null);
  const [viewStatus, setViewStatus] = useState<string | null>(null);

  const activeTarget = target ?? (ownAccount ? { address: ownAccount.address, name: ownAccount.name } : null);

  function resetStats() {
    setAcct(mk(null)); setBal(mk(null)); setNames(mk([])); setGroups(mk([]));
    setFirstTx(mk(null)); setQdnCount(mk(0)); setRewardShares(mk(0)); setActivity(mk(0));
  }

  const loadStatsRef = useRef(0);

  const loadStats = useCallback((t: Target) => {
    const id = ++loadStatsRef.current;
    const guard = <T,>(fn: (v: T) => void) => (v: T) => { if (loadStatsRef.current === id) fn(v); };

    const done = <T,>(set: (s: S<T>) => void) => (value: T) => guard(set)({ loading: false, value });
    const fail = <T,>(set: (s: S<T>) => void, fallback: T) => () => guard(set)({ loading: false, value: fallback });

    getAccountData(t.address).then(done(setAcct)).catch(fail(setAcct, null));
    getBalance(t.address).then(done(setBal)).catch(fail(setBal, null));
    getAccountNames(t.address).then(done(setNames)).catch(fail(setNames, []));
    fetchGroupsByMember(t.address).then(done(setGroups)).catch(fail(setGroups, []));
    fetchFirstTxTimestamp(t.address).then(done(setFirstTx)).catch(fail(setFirstTx, null));
    fetchRewardShareCount(t.address).then(done(setRewardShares)).catch(fail(setRewardShares, 0));
    fetchRecentActivityCount(t.address).then(done(setActivity)).catch(fail(setActivity, 0));

    if (t.name) {
      fetchQdnResourceCount(t.name).then(done(setQdnCount)).catch(fail(setQdnCount, 0));
    } else {
      setQdnCount({ loading: false, value: 0 });
    }
  }, []);

  useEffect(() => {
    if (!activeTarget) return;
    resetStats();
    loadStats(activeTarget);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTarget?.address, activeTarget?.name, loadStats]);

  async function handleSearch() {
    const q = searchInput.trim();
    if (!q) return;
    setSearchLoading(true); setSearchError(null);
    const nameData = await getNameData(q);
    if (!nameData) {
      setSearchError(`Name "${q}" not found.`);
      setSearchLoading(false);
      return;
    }
    const newTarget: Target = { address: nameData.owner, name: nameData.name };
    setTarget(newTarget);
    // Load bio + status for viewed profile
    setViewBio(null); setViewStatus(null);
    fetchBio(nameData.name).then(setViewBio);
    fetchStatus(nameData.name).then(setViewStatus);
    setSearchLoading(false);
  }

  function clearSearch() {
    setTarget(null);
    setSearchInput('');
    setSearchError(null);
    setViewBio(null);
    setViewStatus(null);
  }

  const isViewingOther = !!target;
  const displayName = activeTarget?.name ?? activeTarget?.address?.slice(0, 14) + '…';
  const level = acct.value?.level ?? 0;
  const blocksMinted = acct.value ? acct.value.blocksMinted + (acct.value.blocksMintedAdjustment ?? 0) - (acct.value.blocksMintedPenalty ?? 0) : 0;
  const isMinting = acct.value ? (acct.value.flags & 1) !== 0 : false;
  const qdnDisplay = qdnCount.value >= 500 ? '500+' : String(qdnCount.value);
  const rewardDisplay = rewardShares.value >= 50 ? '50+' : String(rewardShares.value);
  const activityDisplay = activity.value >= 50 ? '50+' : String(activity.value);

  return (
    <Box sx={{ pt: `${tokens.spacing.topBarHeight + 24}px`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 720, mx: 'auto' }}>

      {/* Search bar */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            fullWidth size="small"
            placeholder="Search any name to view their stats…"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setSearchError(null); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            error={!!searchError}
            helperText={searchError ?? undefined}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: '1rem', color: c.textSecondary }} /></InputAdornment>,
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={clearSearch} sx={{ p: 0.25 }}>
                    <CloseIcon sx={{ fontSize: '0.9rem', color: c.textSecondary }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.85rem',
                '& fieldset': { borderColor: c.borderLight },
                '&:hover fieldset': { borderColor: c.accent },
                '&.Mui-focused fieldset': { borderColor: c.accent },
              },
            }}
          />
          <Button
            variant="contained" disableElevation
            disabled={searchLoading || !searchInput.trim()}
            onClick={handleSearch}
            sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 2.5, fontSize: '0.75rem', whiteSpace: 'nowrap', '&:hover': { bgcolor: c.accentHover }, '&.Mui-disabled': { opacity: 0.4, bgcolor: c.accent, color: c.accentText }, width: { xs: '100%', sm: 'auto' } }}
          >
            {searchLoading ? <CircularProgress size={14} sx={{ color: c.accentText }} /> : 'View'}
          </Button>
        </Box>
      </Box>

      {/* Viewed profile banner */}
      {isViewingOther && activeTarget && (
        <Box sx={{ border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, bgcolor: c.surface, p: 2.5, mb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <AvatarDisplay name={activeTarget.name} size={56} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary }}>{activeTarget.name}</Typography>
            <Typography sx={{ fontSize: '0.7rem', color: c.textSecondary, fontFamily: 'monospace', wordBreak: 'break-all' }}>{activeTarget.address}</Typography>
            {viewStatus && <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary, fontStyle: 'italic', mt: 0.5 }}>{viewStatus}</Typography>}
            {viewBio && (
              <BioPreview bio={viewBio} />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Button
              variant="outlined" size="small"
              onClick={() => activeTarget.name && openInExplorer(activeTarget.name)}
              startIcon={<OpenInNewIcon sx={{ fontSize: '0.85rem !important' }} />}
              sx={{ borderColor: c.accent, color: c.accent, borderRadius: '50px', fontSize: '0.72rem', '&:hover': { bgcolor: c.borderLight }, whiteSpace: 'nowrap' }}
            >
              Open in Explorer
            </Button>
            <IconButton size="small" onClick={clearSearch} sx={{ color: c.textSecondary, '&:hover': { color: c.accent }, minWidth: 36, minHeight: 36 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          </Box>
        </Box>
      )}

      {/* Header for own account */}
      {!isViewingOther && (
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 0.5 }}>
            Dashboard
          </Typography>
          <Typography sx={{ fontSize: '1.1rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary }}>
            {displayName}
          </Typography>
        </Box>
      )}

      {/* Stats grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5, alignItems: 'flex-start' }}>

        <StatCard label="Minting Level" value={level} loading={acct.loading} accent
          sub={`Level ${level}${isMinting ? ' · Minting' : ''}`}
          icon={<StarsIcon fontSize="inherit" />}
          onAction={activeTarget ? () => qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('chain', `/#/address/${activeTarget.address}`) }) : undefined}
          actionLabel={appLabel('chain')}
        />

        <StatCard label="Blocks Minted" value={blocksMinted.toLocaleString()} loading={acct.loading}
          sub={acct.value ? [formatMintingTime(blocksMinted), acct.value.blocksMintedPenalty ? `−${acct.value.blocksMintedPenalty.toLocaleString()} penalty` : null].filter(Boolean).join(' · ') : undefined}
          icon={<HardwareIcon fontSize="inherit" />}
          onAction={activeTarget ? () => qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('chain', `/#/address/${activeTarget.address}`) }) : undefined}
          actionLabel={appLabel('chain')}
        />

        <StatCard label="QORT Balance" loading={bal.loading}
          value={bal.value !== null ? bal.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
          sub="native coin"
          icon={<AccountBalanceWalletIcon fontSize="inherit" />}
          onAction={() => qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('wallet', '/#/qortal') })}
          actionLabel={appLabel('wallet')}
        />

        <StatCard label="Account Age" value={formatAge(firstTx.value)} loading={firstTx.loading}
          sub={firstTx.value ? new Date(firstTx.value).toLocaleDateString() : 'No transactions'}
          icon={<CalendarTodayIcon fontSize="inherit" />}
          onAction={activeTarget ? () => qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('chain', `/#/address/${activeTarget.address}`) }) : undefined}
          actionLabel={appLabel('chain')}
        />

        <StatCard label="Groups" loading={groups.loading}
          value={groups.value.length}
          sub={`${groups.value.length} joined`}
          icon={<GroupsIcon fontSize="inherit" />}
          expand={groups.value.length > 0
            ? <GroupList groups={groups.value} onItemClick={g => qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('groups', `/#/group/${g.groupId}`) })} />
            : undefined}
        />

        <StatCard label="Names" loading={names.loading}
          value={names.value.length}
          sub={`${names.value.length} registered`}
          icon={<BadgeIcon fontSize="inherit" />}
          expand={names.value.length > 0
            ? <NameList names={names.value} onItemClick={n => qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('names', `/#/name/${n.name}`) })} />
            : undefined}
        />

        <StatCard label="QDN Resources" value={qdnDisplay} loading={qdnCount.loading}
          sub="published data"
          icon={<StorageIcon fontSize="inherit" />}
          onAction={activeTarget?.name ? () => qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('chain', `/#/name/${activeTarget.name}`) }) : undefined}
          actionLabel={appLabel('chain')}
        />

        <StatCard label="Reward Shares" value={rewardDisplay} loading={rewardShares.loading}
          sub="minting relationships"
          icon={<ShareIcon fontSize="inherit" />}
          onAction={activeTarget ? () => qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('chain', `/#/address/${activeTarget.address}`) }) : undefined}
          actionLabel={appLabel('chain')}
        />

        <StatCard label="Recent Activity" value={activityDisplay} loading={activity.loading}
          sub="transactions (30 days)"
          icon={<BoltIcon fontSize="inherit" />}
          onAction={activeTarget ? () => qortalRequest({ action: 'OPEN_NEW_TAB', qortalLink: appLink('chain', `/#/address/${activeTarget.address}`) }) : undefined}
          actionLabel={appLabel('chain')}
        />
      </Box>
    </Box>
  );
}
