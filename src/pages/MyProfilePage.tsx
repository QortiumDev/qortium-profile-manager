import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton, MenuItem, Select, TextField, Tooltip, Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useAtomValue, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { AvatarEditor } from '../components/profile/AvatarEditor';
import { NameManager } from '../components/profile/NameManager';
import { FeedList } from '../components/feed/FeedList';
import { OnboardingPrompt } from '../components/onboarding/OnboardingPrompt';
import { OnboardingChecklist } from '../components/onboarding/OnboardingChecklist';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';
import { accountAtom, accountLoadingAtom, accountErrorAtom, accountRetryAtom, uiStyleAtom } from '../state/atoms';
import {
  getAccountNames, fetchBio, publishBio, fetchStatus, publishStatus,
  publishAvatar, ensureAccountUnlocked,
} from '../api/qortal';
import { useFriends } from '../hooks/useFriends';
import type { QortalName } from '../types';

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

const ghostSx = (accentColor: string, borderColor: string) => ({
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'transparent', transition: 'border-color 0.15s ease' },
    '&:hover fieldset': { borderColor },
    '&.Mui-focused fieldset': { borderColor: accentColor },
  },
});

export function MyProfilePage() {
  const c = useColors();
  const account = useAtomValue(accountAtom);
  const uiStyle = useAtomValue(uiStyleAtom);
  const isClassic = uiStyle === 'classic';
  const pagePt = 'calc(var(--profile-top-bar-height, 52px) + 24px)';
  const pageMaxWidth = c.layoutWideMaxWidth;
  const accountLoading = useAtomValue(accountLoadingAtom);
  const accountError = useAtomValue(accountErrorAtom);
  const setRetry = useSetAtom(accountRetryAtom);

  const [ownNames, setOwnNames] = useState<QortalName[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveErr, setProfileSaveErr] = useState<string | null>(null);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [avatarSaveMsg, setAvatarSaveMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [avatarKey, setAvatarKey] = useState(0);
  const bioOriginal = useRef('');
  const statusOriginal = useRef('');

  const primaryName = ownNames[0]?.name ?? null;
  const noName = ownNames.length === 0;
  const profileDirty = status !== statusOriginal.current || bio !== bioOriginal.current;

  const { friends, loading: friendsLoading } = useFriends(primaryName);

  const navigate = useNavigate();
  const nameManagerRef = useRef<HTMLDivElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);
  const [onboardingChoice, setOnboardingChoice] = useState<string | null>(() => localStorage.getItem('pm-onboarding-choice'));
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);
  const onboardingStatus = useOnboardingStatus(account?.address ?? null, selectedName);

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
    setSelectedName(primary);
    const b = fetchedBio ?? '';
    const s = fetchedStatus ?? '';
    setBio(b); bioOriginal.current = b;
    setStatus(s); statusOriginal.current = s;
    setProfileLoading(false);
  }, [account]);

  async function switchName(name: string) {
    if (name === selectedName) return;
    setSelectedName(name);
    setProfileLoading(true);
    setAvatarSaveMsg(null);
    const [b, s] = await Promise.all([fetchBio(name), fetchStatus(name)]);
    const bio_ = b ?? ''; const status_ = s ?? '';
    setBio(bio_); bioOriginal.current = bio_;
    setStatus(status_); statusOriginal.current = status_;
    setProfileLoading(false);
    setAvatarKey(k => k + 1);
  }

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (!profileLoading && noName && onboardingChoice === null) {
      setShowOnboardingPrompt(true);
    }
  }, [profileLoading, noName, onboardingChoice]);

  function handleOnboardingAnswer(start: boolean) {
    const choice = start ? 'yes' : 'no';
    localStorage.setItem('pm-onboarding-choice', choice);
    setOnboardingChoice(choice);
    setShowOnboardingPrompt(false);
  }

  function handleCloseChecklist() {
    localStorage.setItem('pm-onboarding-choice', 'no');
    setOnboardingChoice('no');
  }

  function scrollToNameManager() {
    nameManagerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToProfileCard() {
    profileCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveProfile() {
    if (!selectedName) return;
    setSavingProfile(true); setProfileSaveErr(null);
    try {
      if (!await ensureAccountUnlocked()) return;
      const ops: Promise<void>[] = [];
      if (status !== statusOriginal.current)
        ops.push(publishStatus(selectedName, status).then(() => { statusOriginal.current = status; }));
      if (bio !== bioOriginal.current)
        ops.push(publishBio(selectedName, bio).then(() => { bioOriginal.current = bio; }));
      await Promise.all(ops);
    } catch (e) {
      setProfileSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarFile(file: File) {
    if (!selectedName) return;
    if (file.type === 'image/gif' && file.size > 3.75 * 1024 * 1024) {
      setAvatarSaveMsg({ type: 'error', msg: 'GIF too large — max ~3.5 MB. Compress it first and try again.' });
      return;
    }
    setBusyAvatar(true); setAvatarSaveMsg(null);
    try {
      if (!await ensureAccountUnlocked()) return;
      await publishAvatar(selectedName, file);
      setAvatarSaveMsg({ type: 'success', msg: 'Avatar updated.' });
      setAvatarKey(k => k + 1);
      onboardingStatus.refetch();
    } catch (e) {
      setAvatarSaveMsg({ type: 'error', msg: e instanceof Error ? e.message : String(e) });
    } finally { setBusyAvatar(false); }
  }

  if (accountLoading) {
    return (
      <Box sx={{ pt: pagePt, display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={28} sx={{ color: c.accent }} />
      </Box>
    );
  }

  if (accountError || !account) {
    return (
      <Box sx={{ pt: pagePt, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
        <Typography sx={{ color: c.textSecondary, fontSize: '0.9rem' }}>Could not connect to your account.</Typography>
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
      <Box sx={{ pt: pagePt, display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={28} sx={{ color: c.accent }} />
      </Box>
    );
  }

  return (
    <Box sx={{ pt: pagePt, pb: 4, px: { xs: isClassic ? 1.5 : 2, md: isClassic ? 3 : 4 }, maxWidth: pageMaxWidth, mx: 'auto' }}>

      <Box ref={profileCardRef} sx={{ border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, bgcolor: c.surface, p: 3, mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', gap: 3, scrollMarginTop: 'var(--profile-top-bar-height, 52px)' }}>

        <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ position: 'relative' }}>
            {busyAvatar && (
              <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <CircularProgress size={20} sx={{ color: '#fff' }} />
              </Box>
            )}
            <AvatarEditor key={avatarKey} name={selectedName} size={88} onFileSelected={handleAvatarFile} />
          </Box>
          <Typography sx={{ fontSize: '0.6rem', color: c.textSecondary, opacity: 0.45, letterSpacing: '0.02em' }}>
            GIF ok · max 3.5 MB
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {noName ? (
            <Typography sx={{ fontSize: '1rem', color: c.textSecondary, mb: 0.5 }}>
              No name registered yet
            </Typography>
          ) : ownNames.length > 1 ? (
            <Select
              variant="standard"
              value={selectedName ?? ''}
              onChange={e => void switchName(e.target.value)}
              disableUnderline
              sx={{
                fontSize: '1.4rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary,
                lineHeight: 1.2, mb: 0.1,
                '& .MuiSelect-select': { p: 0, pr: '24px !important' },
                '& .MuiSelect-icon': { color: c.textSecondary, fontSize: '1.2rem' },
              }}
            >
              {ownNames.map(n => (
                <MenuItem key={n.name} value={n.name} sx={{ fontSize: '0.9rem' }}>{n.name}</MenuItem>
              ))}
            </Select>
          ) : (
            <Typography sx={{ fontSize: '1.4rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, lineHeight: 1.2, mb: 0.1, wordBreak: 'break-word' }}>
              {selectedName}
            </Typography>
          )}

          <CopyAddress address={account.address} />

          <TextField fullWidth size="small"
            placeholder={noName ? 'Register a name to set a status…' : 'Add a status…'}
            disabled={!selectedName}
            value={status}
            onChange={e => setStatus(e.target.value)}
            inputProps={{ maxLength: 160 }}
            sx={{
              mt: 1,
              ...ghostSx(c.accent, c.borderLight),
              '& .MuiOutlinedInput-root': {
                fontSize: '0.85rem', fontStyle: 'italic', color: c.textSecondary,
                '& fieldset': { borderColor: 'transparent', transition: 'border-color 0.15s ease' },
                '&:hover fieldset': { borderColor: c.borderLight },
                '&.Mui-focused fieldset': { borderColor: c.accent },
                '& input': { px: 1, py: 0.75 },
              },
              '& input::placeholder': { color: c.textSecondary, opacity: 0.45, fontStyle: 'italic' },
            }}
          />

          <TextField fullWidth multiline rows={3}
            placeholder={noName ? 'Register a name to add a bio…' : 'Write something about yourself…'}
            disabled={!selectedName}
            value={bio}
            onChange={e => setBio(e.target.value)}
            sx={{
              mt: 0.5,
              ...ghostSx(c.accent, c.borderLight),
              '& .MuiOutlinedInput-root': {
                fontSize: '0.82rem', color: c.textSecondary,
                '& fieldset': { borderColor: 'transparent', transition: 'border-color 0.15s ease' },
                '&:hover fieldset': { borderColor: c.borderLight },
                '&.Mui-focused fieldset': { borderColor: c.accent },
                '& textarea': { px: 1, py: 0.75 },
              },
              '& textarea::placeholder': { color: c.textSecondary, opacity: 0.45 },
            }}
          />

          {profileDirty && !!selectedName && (
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

          {avatarSaveMsg && (
            <Alert severity={avatarSaveMsg.type} onClose={() => setAvatarSaveMsg(null)} sx={{ mt: 1.5, fontSize: '0.75rem', py: 0 }}>
              {avatarSaveMsg.msg}
            </Alert>
          )}
        </Box>
      </Box>

      {noName && (
        <Box ref={nameManagerRef} sx={{ mb: 3, scrollMarginTop: 'var(--profile-top-bar-height, 52px)' }}>
          <NameManager names={ownNames} onRefresh={loadProfile} />
        </Box>
      )}

      <OnboardingPrompt open={showOnboardingPrompt} onAnswer={handleOnboardingAnswer} />

      {onboardingChoice === 'yes' && (
        <OnboardingChecklist
          hasName={!noName}
          hasAvatar={onboardingStatus.avatar.value}
          hasBio={bioOriginal.current.trim().length > 0}
          hasStatus={statusOriginal.current.trim().length > 0}
          hasFriends={friends.length > 0}
          hasJoinedGroup={onboardingStatus.groups.value}
          hasWalletCard={onboardingStatus.walletCard.value}
          hasFollowedNode={onboardingStatus.followedNodes.value}
          onScrollToNameManager={scrollToNameManager}
          onScrollToProfileCard={scrollToProfileCard}
          onGoToFriends={() => navigate('/friends')}
          onClose={handleCloseChecklist}
        />
      )}

      {friendsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={20} sx={{ color: c.accent }} />
        </Box>
      ) : (
        <FeedList mode="home" friendNames={friends} selfName={selectedName} />
      )}
    </Box>
  );
}
