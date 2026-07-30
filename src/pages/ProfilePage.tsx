import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import BadgeIcon from '@mui/icons-material/Badge';
import StorageIcon from '@mui/icons-material/Storage';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import StarsIcon from '@mui/icons-material/Stars';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HardwareIcon from '@mui/icons-material/Hardware';
import ShareIcon from '@mui/icons-material/Share';
import BoltIcon from '@mui/icons-material/Bolt';
import PeopleIcon from '@mui/icons-material/People';
import { useAtomValue } from 'jotai';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { StatCard } from '../components/dashboard/StatCard';
import { AvatarDisplay } from '../components/profile/AvatarDisplay';
import { FriendTile } from '../components/friends/FriendTile';
import { FeedList } from '../components/feed/FeedList';
import { accountAtom, uiStyleAtom } from '../state/atoms';
import { getNameData, fetchBio, fetchStatus, fetchFriends } from '../api/qortal';
import { useAccountStats } from '../hooks/useAccountStats';
import { useFriends } from '../hooks/useFriends';
import { appLink, appLabel, type AppKey } from '../apps';

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

async function openApp(app: AppKey, route = '') {
  const path = route ? `?_route=${encodeURIComponent(route)}` : '';
  try {
    await qdnRequest({ action: 'OPEN_NEW_TAB', address: appLink(app, path) });
  } catch { /* ignore */ }
}

export function ProfilePage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const c = useColors();
  const uiStyle = useAtomValue(uiStyleAtom);
  const isClassic = uiStyle === 'classic';
  const pagePt = 'calc(var(--profile-top-bar-height, 52px) + 24px)';
  const pageMaxWidth = c.layoutWideMaxWidth;
  const account = useAtomValue(accountAtom);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [owner, setOwner] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [theirFriends, setTheirFriends] = useState<string[]>([]);

  useEffect(() => {
    if (!name) return;
    if (account?.name === name) { navigate('/', { replace: true }); return; }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getNameData(name).then(async data => {
      if (cancelled) return;
      if (!data) { setNotFound(true); setLoading(false); return; }
      setOwner(data.owner);
      const [b, s, f] = await Promise.all([fetchBio(name), fetchStatus(name), fetchFriends(name)]);
      if (cancelled) return;
      setBio(b); setStatus(s); setTheirFriends(f);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [name, account?.name, navigate]);

  const stats = useAccountStats(owner, name ?? null);
  const { friends: myFriends, add: addFriend, remove: removeFriend } = useFriends(account?.name ?? null);
  const [friendBusy, setFriendBusy] = useState(false);
  const isFriend = !!name && myFriends.includes(name);

  async function handleToggleFriend() {
    if (!name || !account?.name || friendBusy) return;
    setFriendBusy(true);
    try {
      if (isFriend) await removeFriend(name);
      else await addFriend(name);
    } finally {
      setFriendBusy(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ pt: pagePt, display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} sx={{ color: c.accent }} />
      </Box>
    );
  }

  if (notFound || !name || !owner) {
    return (
      <Box sx={{ pt: pagePt, textAlign: 'center', py: 8 }}>
        <Typography sx={{ color: c.textSecondary, fontSize: '0.9rem' }}>Name "{name}" not found.</Typography>
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

      <Box sx={{ border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, bgcolor: c.surface, p: 3, mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', gap: 3 }}>
        <AvatarDisplay name={name} size={88} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '1.4rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary }}>{name}</Typography>
            {account?.name && (
              <Button
                variant="outlined" size="small"
                disabled={friendBusy}
                onClick={handleToggleFriend}
                sx={{
                  fontSize: '0.7rem', borderRadius: '50px', px: 1.5, py: 0.25,
                  borderColor: isFriend ? c.error : c.accent,
                  color: isFriend ? c.error : c.accent,
                }}
              >
                {friendBusy ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : isFriend ? 'Remove Friend' : 'Add Friend'}
              </Button>
            )}
          </Box>
          {status && <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary, fontStyle: 'italic', mt: 0.5 }}>{status}</Typography>}
          {bio && <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary, mt: 0.5, whiteSpace: 'pre-wrap' }}>{bio}</Typography>}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5, mb: 3 }}>
        <StatCard label="Minting Level" value={level} loading={stats.acct.loading} accent
          sub={`Level ${level}${isMinting ? ' · Minting' : ''}`}
          icon={<StarsIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${owner}`)}
          actionLabel={appLabel('chain')}
        />
        <StatCard label="Blocks Minted" value={blocksMinted.toLocaleString()} loading={stats.acct.loading}
          sub={stats.acct.value ? [formatMintingTime(blocksMinted), stats.acct.value.blocksMintedPenalty ? `−${stats.acct.value.blocksMintedPenalty.toLocaleString()} penalty` : null].filter(Boolean).join(' · ') : undefined}
          icon={<HardwareIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${owner}`)}
          actionLabel={appLabel('chain')}
        />
        <StatCard label="Account Age" value={formatAge(stats.firstTx.value)} loading={stats.firstTx.loading}
          sub={stats.firstTx.value ? new Date(stats.firstTx.value).toLocaleDateString() : 'No transactions'}
          icon={<CalendarTodayIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${owner}`)}
          actionLabel={appLabel('chain')}
        />
        <StatCard label="Groups" value={stats.groups.value.length} loading={stats.groups.loading}
          sub={`${stats.groups.value.length} joined`}
          icon={<GroupsIcon fontSize="inherit" />}
          onAction={() => void openApp('groups', `/address/${owner}`)}
          actionLabel={appLabel('groups')}
        />
        <StatCard label="Names" value={stats.statNames.value.length} loading={stats.statNames.loading}
          sub={`${stats.statNames.value.length} registered`}
          icon={<BadgeIcon fontSize="inherit" />}
          onAction={() => void openApp('names', `/name/${name}`)}
          actionLabel={appLabel('names')}
        />
        <StatCard label="QDN Resources" value={qdnDisplay} loading={stats.qdnCount.loading}
          sub="published data"
          icon={<StorageIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/name/${name}`)}
          actionLabel={appLabel('chain')}
        />
        <StatCard label="Balance" loading={stats.bal.loading}
          value={stats.bal.value !== null ? stats.bal.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
          sub="QORT · native coin"
          icon={<AccountBalanceWalletIcon fontSize="inherit" />}
        />
        <StatCard label="Reward Shares" value={rewardDisplay} loading={stats.rewardShares.loading}
          sub="minting relationships"
          icon={<ShareIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${owner}`)}
          actionLabel={appLabel('chain')}
        />
        <StatCard label="Recent Activity" value={actDisplay} loading={stats.activity.loading}
          sub="transactions (30 days)"
          icon={<BoltIcon fontSize="inherit" />}
          onAction={() => void openApp('chain', `/address/${owner}`)}
          actionLabel={appLabel('chain')}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 1.5 }}>
          Friends{theirFriends.length > 0 ? ` (${theirFriends.length})` : ''}
        </Typography>
        {theirFriends.length === 0 ? (
          <Box sx={{ border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PeopleIcon sx={{ fontSize: '1.25rem', color: c.textSecondary, opacity: 0.4 }} />
            <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary }}>No friends listed.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
            {theirFriends.map(n => (
              <FriendTile key={n} name={n} onClick={() => navigate(`/profile/${encodeURIComponent(n)}`)} />
            ))}
          </Box>
        )}
      </Box>

      <Box>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 1.5 }}>
          Activity
        </Typography>
        <FeedList mode="single" friendNames={[]} selfName={name} />
      </Box>
    </Box>
  );
}
