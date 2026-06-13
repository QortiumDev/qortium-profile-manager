import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Alert, Box, Button, CircularProgress, Collapse, IconButton,
  InputAdornment, TextField, Tooltip, Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
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
import { useAtomValue, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { AvatarEditor } from '../components/profile/AvatarEditor';
import { AvatarDisplay } from '../components/profile/AvatarDisplay';
import { StatCard } from '../components/dashboard/StatCard';
import { FriendTile } from '../components/friends/FriendTile';
import { accountAtom, accountLoadingAtom, accountErrorAtom, accountRetryAtom } from '../state/atoms';
import {
  getAccountNames, fetchBio, publishBio, fetchStatus, publishStatus,
  publishAvatar, getAccountData, getBalance, getNameData, fetchFriends,
} from '../api/qortal';
import { fetchGroupsByMember, fetchFirstTxTimestamp, fetchQdnResourceCount, fetchRewardShareCount, fetchRecentActivityCount } from '../api/rest';
import { useFriends } from '../hooks/useFriends';
import type { QortalAccount, QortalGroup, QortalName } from '../types';

// LEVEL_LABELS — un-comment to restore named level display
// const LEVEL_LABELS: Record<number, string> = {
//   0: 'Unregistered', 1: 'Initiate', 2: 'Member', 3: 'Full Member',
//   4: 'Minter', 5: 'Mentor', 6: 'Architect', 7: 'Senior Architect',
//   8: 'Elder', 9: 'Grand Elder', 10: 'Grand Elder',
// };

type S<T> = { loading: boolean; value: T };
const mk = <T,>(v: T): S<T> => ({ loading: true, value: v });
interface Target { address: string; name: string | null }

function CopyAddress({ address }: { address: string }) {
  const c = useColors();
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary, fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {address}
      </Typography>
      <Tooltip title={copied ? 'Copied!' : 'Copy address'}>
        <IconButton size="small" onClick={copy} sx={{ color: c.textSecondary, '&:hover': { color: c.accent }, p: 0.5 }}>
          {copied ? <CheckIcon sx={{ fontSize: '0.9rem' }} /> : <ContentCopyIcon sx={{ fontSize: '0.9rem' }} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function BioPreview({ bio }: { bio: string }) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  return (
    <Box sx={{ mt: 0.25 }}>
      <Collapse in={expanded} collapsedSize={0}>
        <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {bio}
        </Typography>
      </Collapse>
      <Box onClick={() => setExpanded(e => !e)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', color: c.accent, mt: 0.25, '&:hover': { opacity: 0.75 } }}>
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

const ghostSx = (accentColor: string, borderColor: string) => ({
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'transparent', transition: 'border-color 0.15s ease' },
    '&:hover fieldset': { borderColor },
    '&.Mui-focused fieldset': { borderColor: accentColor },
  },
});

export function MyProfilePage() {
  const c = useColors();
  const navigate = useNavigate();
  const account = useAtomValue(accountAtom);
  const accountLoading = useAtomValue(accountLoadingAtom);
  const accountError = useAtomValue(accountErrorAtom);
  const setRetry = useSetAtom(accountRetryAtom);

  // Own profile state
  const [ownNames, setOwnNames]             = useState<QortalName[]>([]);
  const [bio, setBio]                       = useState('');
  const [status, setStatus]                 = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileReady, setProfileReady]     = useState(false);
  const [savingProfile, setSavingProfile]   = useState(false);
  const [profileSaveErr, setProfileSaveErr] = useState<string | null>(null);
  const [busyAvatar, setBusyAvatar]         = useState(false);
  const [avatarSaveMsg, setAvatarSaveMsg]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [avatarKey, setAvatarKey]           = useState(0);
  const bioOriginal    = useRef('');
  const statusOriginal = useRef('');

  // Search state
  const [searchInput, setSearchInput]       = useState('');
  const [searchLoading, setSearchLoading]   = useState(false);
  const [searchError, setSearchError]       = useState<string | null>(null);
  const [searchTarget, setSearchTarget]     = useState<Target | null>(null);
  const [viewBio, setViewBio]               = useState<string | null>(null);
  const [viewStatus, setViewStatus]         = useState<string | null>(null);
  const [viewFriends, setViewFriends]       = useState<string[]>([]);

  // Per-stat state
  const [acct,         setAcct]         = useState(mk<QortalAccount | null>(null));
  const [bal,          setBal]          = useState(mk<number | null>(null));
  const [statNames,    setStatNames]    = useState(mk<QortalName[]>([]));
  const [groups,       setGroups]       = useState(mk<QortalGroup[]>([]));
  const [firstTx,      setFirstTx]      = useState(mk<number | null>(null));
  const [qdnCount,     setQdnCount]     = useState(mk<number>(0));
  const [rewardShares, setRewardShares] = useState(mk<number>(0));
  const [activity,     setActivity]     = useState(mk<number>(0));

  const primaryName    = ownNames[0]?.name ?? null;
  const extraNames     = ownNames.length > 1 ? ownNames.length - 1 : 0;
  const noName         = !primaryName;
  const activeTarget   = searchTarget ?? (account ? { address: account.address, name: primaryName } : null);
  const isViewingOther = !!searchTarget;
  const profileDirty   = status !== statusOriginal.current || bio !== bioOriginal.current;

  const { friends, loading: friendsLoading, add: addFriend, remove: removeFriend } = useFriends(primaryName);
  const [friendBusy, setFriendBusy] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const isFriend = !!searchTarget?.name && friends.includes(searchTarget.name);

  async function handleToggleFriend() {
    if (!searchTarget?.name || !primaryName || friendBusy) return;
    setFriendBusy(true); setFriendError(null);
    try {
      if (isFriend) await removeFriend(searchTarget.name);
      else await addFriend(searchTarget.name);
    } catch (e) {
      setFriendError(e instanceof Error ? e.message : String(e));
    } finally {
      setFriendBusy(false);
    }
  }

  const loadStatsRef = useRef(0);

  const loadStats = useCallback((t: Target) => {
    const id = ++loadStatsRef.current;
    const guard = <T,>(fn: (v: T) => void) => (v: T) => { if (loadStatsRef.current === id) fn(v); };
    const done  = <T,>(set: (s: S<T>) => void) => (value: T) => guard(set)({ loading: false, value });
    const fail  = <T,>(set: (s: S<T>) => void, fb: T) => () => guard(set)({ loading: false, value: fb });

    setAcct(mk(null)); setBal(mk(null)); setStatNames(mk([])); setGroups(mk([]));
    setFirstTx(mk(null)); setQdnCount(mk(0)); setRewardShares(mk(0)); setActivity(mk(0));

    getAccountData(t.address).then(done(setAcct)).catch(fail(setAcct, null));
    getBalance(t.address).then(done(setBal)).catch(fail(setBal, null));
    getAccountNames(t.address).then(done(setStatNames)).catch(fail(setStatNames, []));
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

  const loadProfile = useCallback(async () => {
    if (!account) return;
    setProfileLoading(true);
    const fetchedNames = await getAccountNames(account.address);
    const primary = fetchedNames[0]?.name ?? null;
    const [fetchedBio, fetchedStatus] = await Promise.all([
      primary ? fetchBio(primary) : null,
      primary ? fetchStatus(primary) : null,
    ]);
    setOwnNames(fetchedNames);
    const b = fetchedBio ?? '';
    const s = fetchedStatus ?? '';
    setBio(b); bioOriginal.current = b;
    setStatus(s); statusOriginal.current = s;
    setProfileLoading(false);
    setProfileReady(true);
    loadStats({ address: account.address, name: primary });
  }, [account, loadStats]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  async function saveProfile() {
    if (!primaryName) return;
    setSavingProfile(true); setProfileSaveErr(null);
    try {
      const ops: Promise<void>[] = [];
      if (status !== statusOriginal.current)
        ops.push(publishStatus(primaryName, status).then(() => { statusOriginal.current = status; }));
      if (bio !== bioOriginal.current)
        ops.push(publishBio(primaryName, bio).then(() => { bioOriginal.current = bio; }));
      await Promise.all(ops);
    } catch (e) {
      setProfileSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarFile(file: File) {
    if (!primaryName) return;
    if (file.type === 'image/gif' && file.size > 3.75 * 1024 * 1024) {
      setAvatarSaveMsg({ type: 'error', msg: 'GIF too large — max ~3.5 MB. Compress it first and try again.' });
      return;
    }
    setBusyAvatar(true); setAvatarSaveMsg(null);
    try {
      await publishAvatar(primaryName, file);
      setAvatarSaveMsg({ type: 'success', msg: 'Avatar updated.' });
      setAvatarKey(k => k + 1);
    } catch (e) {
      setAvatarSaveMsg({ type: 'error', msg: e instanceof Error ? e.message : String(e) });
    } finally { setBusyAvatar(false); }
  }

  async function loadTargetByName(name: string) {
    setSearchLoading(true); setSearchError(null);
    setViewBio(null); setViewStatus(null); setViewFriends([]);
    const nameData = await getNameData(name);
    if (!nameData) {
      setSearchError(`Name "${name}" not found.`);
      setSearchLoading(false);
      return;
    }
    const newTarget: Target = { address: nameData.owner, name: nameData.name };
    setSearchTarget(newTarget);
    setSearchInput(nameData.name);
    fetchBio(nameData.name).then(setViewBio);
    fetchStatus(nameData.name).then(setViewStatus);
    fetchFriends(nameData.name).then(setViewFriends);
    loadStats(newTarget);
    setSearchLoading(false);
  }

  async function handleSearch() {
    const q = searchInput.trim();
    if (!q) return;
    await loadTargetByName(q);
  }

  function clearSearch() {
    setSearchTarget(null);
    setSearchInput('');
    setSearchError(null);
    setViewBio(null);
    setViewStatus(null);
    setViewFriends([]);
    if (account) loadStats({ address: account.address, name: primaryName });
  }

  if (accountLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={28} sx={{ color: c.accent }} />
      </Box>
    );
  }

  if (accountError || !account) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
        <Typography sx={{ color: c.textSecondary, fontSize: '0.9rem' }}>
          Could not connect to your account.
        </Typography>
        <Button variant="contained" disableElevation size="small"
          onClick={() => setRetry(n => n + 1)}
          sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 2.5, fontSize: '0.75rem', '&:hover': { bgcolor: c.accentHover } }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (profileLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={28} sx={{ color: c.accent }} />
      </Box>
    );
  }

  const level         = acct.value?.level ?? 0;
  const blocksMinted  = acct.value ? acct.value.blocksMinted + (acct.value.blocksMintedAdjustment ?? 0) - (acct.value.blocksMintedPenalty ?? 0) : 0;
  const isMinting     = acct.value ? (acct.value.flags & 1) !== 0 : false;
  const qdnDisplay    = qdnCount.value >= 500 ? '500+' : String(qdnCount.value);
  const rewardDisplay = rewardShares.value >= 50 ? '50+' : String(rewardShares.value);
  const actDisplay    = activity.value >= 50 ? '50+' : String(activity.value);

  return (
    <Box sx={{ pt: `${tokens.spacing.topBarHeight + 24}px`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 720, mx: 'auto' }}>

      {/* Profile card */}
      <Box sx={{ border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, bgcolor: c.surface, p: 3, mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', gap: 3 }}>

        {/* Avatar */}
        <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ position: 'relative' }}>
            {busyAvatar && (
              <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <CircularProgress size={20} sx={{ color: '#fff' }} />
              </Box>
            )}
            <AvatarEditor key={avatarKey} name={noName ? null : primaryName} size={88} onFileSelected={handleAvatarFile} />
          </Box>
          <Typography sx={{ fontSize: '0.6rem', color: c.textSecondary, opacity: 0.45, letterSpacing: '0.02em' }}>
            GIF ok · max 3.5 MB
          </Typography>
        </Box>

        {/* Info + ghost fields */}
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>

          {/* Name */}
          {noName ? (
            <Typography sx={{ fontSize: '1rem', color: c.textSecondary, mb: 0.5 }}>
              No name registered —{' '}
              <Box component="span" sx={{ color: c.accent }}>
                register one
              </Box>
            </Typography>
          ) : (
            <Typography sx={{ fontSize: '1.4rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, lineHeight: 1.2, mb: 0.1 }}>
              {primaryName}
            </Typography>
          )}

          {extraNames > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, mb: 0.25, color: c.accent }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: tokens.typography.weightMedium }}>
                and {extraNames} other name{extraNames > 1 ? 's' : ''}
              </Typography>
              <ArrowForwardIcon sx={{ fontSize: '0.85rem' }} />
            </Box>
          )}

          <CopyAddress address={account.address} />

          {/* Ghost status */}
          <TextField fullWidth size="small"
            placeholder={noName ? 'Register a name to set a status…' : 'Add a status…'}
            disabled={noName}
            value={status}
            onChange={e => setStatus(e.target.value)}
            inputProps={{ maxLength: 160 }}
            sx={{
              mt: 1,
              ...ghostSx(c.accent, c.borderLight),
              '& .MuiOutlinedInput-root': {
                fontSize: '0.85rem',
                fontStyle: 'italic',
                color: c.textSecondary,
                '& fieldset': { borderColor: 'transparent', transition: 'border-color 0.15s ease' },
                '&:hover fieldset': { borderColor: c.borderLight },
                '&.Mui-focused fieldset': { borderColor: c.accent },
                '& input': { px: 1, py: 0.75 },
              },
              '& input::placeholder': { color: c.textSecondary, opacity: 0.45, fontStyle: 'italic' },
            }}
          />

          {/* Ghost bio */}
          <TextField fullWidth multiline rows={3}
            placeholder={noName ? 'Register a name to add a bio…' : 'Write something about yourself…'}
            disabled={noName}
            value={bio}
            onChange={e => setBio(e.target.value)}
            sx={{
              mt: 0.5,
              ...ghostSx(c.accent, c.borderLight),
              '& .MuiOutlinedInput-root': {
                fontSize: '0.82rem',
                color: c.textSecondary,
                '& fieldset': { borderColor: 'transparent', transition: 'border-color 0.15s ease' },
                '&:hover fieldset': { borderColor: c.borderLight },
                '&.Mui-focused fieldset': { borderColor: c.accent },
                '& textarea': { px: 1, py: 0.75 },
              },
              '& textarea::placeholder': { color: c.textSecondary, opacity: 0.45 },
            }}
          />

          {/* Save row — appears only when dirty */}
          {profileDirty && !noName && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 1 }}>
              {profileSaveErr && (
                <Typography sx={{ fontSize: '0.72rem', color: c.error, flex: 1 }}>{profileSaveErr}</Typography>
              )}
              <Button variant="contained" disableElevation size="small"
                disabled={savingProfile}
                onClick={saveProfile}
                sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: '50px', fontSize: '0.72rem', px: 2, py: 0.5, '&:hover': { bgcolor: c.accentHover }, '&.Mui-disabled': { opacity: 0.35, bgcolor: c.accent, color: c.accentText } }}
              >
                {savingProfile ? <CircularProgress size={11} sx={{ color: c.accentText }} /> : 'Save'}
              </Button>
            </Box>
          )}

          {/* Avatar save feedback */}
          {avatarSaveMsg && (
            <Alert severity={avatarSaveMsg.type} onClose={() => setAvatarSaveMsg(null)} sx={{ mt: 1.5, fontSize: '0.75rem', py: 0 }}>
              {avatarSaveMsg.msg}
            </Alert>
          )}
        </Box>
      </Box>

      {/* Search bar */}
      {profileReady && (
        <>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField fullWidth size="small"
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
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.85rem', '& fieldset': { borderColor: c.borderLight }, '&:hover fieldset': { borderColor: c.accent }, '&.Mui-focused fieldset': { borderColor: c.accent } } }}
              />
              <Button variant="contained" disableElevation
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
                  {viewBio && <BioPreview bio={viewBio} />}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
                  {primaryName && (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={friendBusy}
                      onClick={handleToggleFriend}
                      sx={{
                        fontSize: '0.7rem', borderRadius: '50px', px: 1.5, py: 0.25,
                        borderColor: isFriend ? c.error : c.accent,
                        color: isFriend ? c.error : c.accent,
                        '&:hover': { borderColor: isFriend ? c.error : c.accentHover, bgcolor: 'transparent', opacity: 0.8 },
                        '&.Mui-disabled': { opacity: 0.4 },
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {friendBusy
                        ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                        : isFriend ? 'Remove Friend' : 'Add Friend'}
                    </Button>
                  )}
                  {friendError && (
                    <Typography sx={{ fontSize: '0.68rem', color: c.error }}>{friendError}</Typography>
                  )}
                  <IconButton size="small" onClick={clearSearch} sx={{ color: c.textSecondary, '&:hover': { color: c.accent }, minWidth: 36, minHeight: 36 }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          )}

          {/* Stats grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5, alignItems: 'flex-start' }}>

            <StatCard label="Minting Level" value={level} loading={acct.loading} accent
              sub={`Level ${level}${isMinting ? ' · Minting' : ''}`}
              icon={<StarsIcon fontSize="inherit" />}
            />

            <StatCard label="Blocks Minted" value={blocksMinted.toLocaleString()} loading={acct.loading}
              sub={acct.value ? [formatMintingTime(blocksMinted), acct.value.blocksMintedPenalty ? `−${acct.value.blocksMintedPenalty.toLocaleString()} penalty` : null].filter(Boolean).join(' · ') : undefined}
              icon={<HardwareIcon fontSize="inherit" />}
            />

            <StatCard label="Account Age" value={formatAge(firstTx.value)} loading={firstTx.loading}
              sub={firstTx.value ? new Date(firstTx.value).toLocaleDateString() : 'No transactions'}
              icon={<CalendarTodayIcon fontSize="inherit" />}
            />

            <StatCard label="Groups" value={groups.value.length} loading={groups.loading}
              sub={`${groups.value.length} joined`}
              icon={<GroupsIcon fontSize="inherit" />}
            />

            <StatCard label="Names" value={statNames.value.length} loading={statNames.loading}
              sub={`${statNames.value.length} registered`}
              icon={<BadgeIcon fontSize="inherit" />}
            />

            <StatCard label="QDN Resources" value={qdnDisplay} loading={qdnCount.loading}
              sub="published data"
              icon={<StorageIcon fontSize="inherit" />}
            />

            <StatCard label="Balance" loading={bal.loading}
              value={bal.value !== null ? bal.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
              sub="QORT · native coin"
              icon={<AccountBalanceWalletIcon fontSize="inherit" />}
            />

            <StatCard label="Reward Shares" value={rewardDisplay} loading={rewardShares.loading}
              sub="minting relationships"
              icon={<ShareIcon fontSize="inherit" />}
            />

            <StatCard label="Recent Activity" value={actDisplay} loading={activity.loading}
              sub="transactions (30 days)"
              icon={<BoltIcon fontSize="inherit" />}
            />
          </Box>

          {/* Viewed person's friends — only shown when viewing another profile */}
          {isViewingOther && activeTarget?.name && (
            <Box sx={{ mt: 3 }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 1.5 }}>
                {activeTarget.name}'s Friends{viewFriends.length > 0 ? ` (${viewFriends.length})` : ''}
              </Typography>
              {viewFriends.length === 0 ? (
                <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary, opacity: 0.6 }}>
                  No friends listed.
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  {viewFriends.map(name => (
                    <FriendTile key={name} name={name} onClick={() => { void loadTargetByName(name); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Friends strip — only shown on own profile */}
          {!isViewingOther && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary }}>
                  Friends{friends.length > 0 ? ` (${friends.length})` : ''}
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/friends')}
                  sx={{ ml: 'auto', fontSize: '0.72rem', color: c.accent, p: 0, minWidth: 0, '&:hover': { bgcolor: 'transparent', opacity: 0.7 }, textTransform: 'none' }}
                >
                  Manage
                </Button>
              </Box>

              {friendsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={20} sx={{ color: c.accent }} />
                </Box>
              ) : friends.length === 0 ? (
                <Box
                  onClick={() => navigate('/friends')}
                  sx={{ border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { borderColor: c.accent }, transition: 'border-color 0.15s ease' }}
                >
                  <PeopleIcon sx={{ fontSize: '1.25rem', color: c.textSecondary, opacity: 0.4 }} />
                  <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary }}>No friends yet — add some</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  {friends.map(name => (
                    <FriendTile key={name} name={name} onClick={() => { void loadTargetByName(name); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
