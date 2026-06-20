import { useState, useEffect, useRef } from 'react';
import {
  Alert, Box, Button, CircularProgress, TextField, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import { useAtomValue } from 'jotai';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { FriendTile } from '../components/friends/FriendTile';
import { accountAtom } from '../state/atoms';
import { getNameData, fetchFriends, searchNames } from '../api/qortal';
import { AvatarDisplay } from '../components/profile/AvatarDisplay';
import { useFriends } from '../hooks/useFriends';

export function FriendsPage() {
  const c = useColors();
  const navigate = useNavigate();
  const account = useAtomValue(accountAtom);
  const primaryName = account?.name ?? null;

  const { friends, loading: friendsLoading, add, remove, refresh } = useFriends(primaryName);

  const [pendingFriend, setPendingFriend] = useState<string | null>(
    () => localStorage.getItem('pm-pending-friend')
  );

  // Keep a ref so polling callbacks can read the latest friends without deps
  const friendsRef = useRef<string[]>([]);
  useEffect(() => { friendsRef.current = friends; }, [friends]);

  // After a reload caused by add-friend, poll until the new friend appears in QDN
  useEffect(() => {
    if (!primaryName || friendsLoading) return;
    const pending = localStorage.getItem('pm-pending-friend');
    if (!pending) return;
    if (friendsRef.current.includes(pending)) {
      localStorage.removeItem('pm-pending-friend');
      setPendingFriend(null);
      return;
    }
    let intervalId: ReturnType<typeof setInterval>;
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      localStorage.removeItem('pm-pending-friend');
      setPendingFriend(null);
    }, 120_000);
    intervalId = setInterval(async () => {
      await refresh();
      if (friendsRef.current.includes(pending)) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        localStorage.removeItem('pm-pending-friend');
        setPendingFriend(null);
      }
    }, 5000);
    return () => { clearInterval(intervalId); clearTimeout(timeoutId); };
  }, [primaryName, friendsLoading, refresh]);

  async function handleRemovePending() {
    if (!pendingFriend || !primaryName || removingName) return;
    localStorage.removeItem('pm-pending-friend');
    setPendingFriend(null);
    setRemovingName(pendingFriend);
    try { await remove(pendingFriend); } finally { setRemovingName(null); }
  }

  const [addInput, setAddInput]         = useState('');
  const [addBusy, setAddBusy]           = useState(false);
  const [addError, setAddError]         = useState<string | null>(null);
  const [addSuccess, setAddSuccess]     = useState<string | null>(null);
  const [addSuggestions, setAddSuggestions] = useState<string[]>([]);
  const [removingName, setRemovingName] = useState<string | null>(null);

  const [viewInput, setViewInput]   = useState('');
  const [viewTarget, setViewTarget] = useState<string | null>(null);
  const [viewFriends, setViewFriends] = useState<string[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError]   = useState<string | null>(null);

  async function handleAdd() {
    const name = addInput.trim();
    if (!name || !primaryName) return;
    if (name === primaryName) { setAddError("You can't add yourself."); return; }
    if (friends.includes(name)) { setAddError(`${name} is already a friend.`); return; }
    setAddBusy(true); setAddError(null); setAddSuccess(null);
    try {
      const nameData = await getNameData(name);
      if (!nameData) { setAddError(`Name "${name}" not found.`); return; }
      localStorage.setItem('pm-pending-friend', name);
      localStorage.setItem('pm-return-path', '/friends');
      await add(name);
      localStorage.removeItem('pm-return-path');
      localStorage.removeItem('pm-pending-friend');
      setAddSuccess(`${name} added!`);
      setAddInput('');
      navigate('/friends');
      setTimeout(() => setAddSuccess(null), 3000);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : String(e));
    } finally {
      setAddBusy(false);
    }
  }

  async function handleRemove(name: string) {
    if (removingName) return;
    setRemovingName(name);
    try { await remove(name); } finally { setRemovingName(null); }
  }

  async function handleViewSearch() {
    const name = viewInput.trim();
    if (!name) return;
    setViewLoading(true); setViewError(null); setViewFriends([]); setViewTarget(null);
    try {
      const nameData = await getNameData(name);
      if (!nameData) { setViewError(`Name "${name}" not found.`); return; }
      setViewTarget(name);
      setViewFriends(await fetchFriends(name));
    } finally {
      setViewLoading(false);
    }
  }

  function SectionLabel({ text }: { text: string }) {
    return (
      <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 1.5 }}>
        {text}
      </Typography>
    );
  }

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      fontSize: '0.85rem',
      '& fieldset': { borderColor: c.borderLight },
      '&:hover fieldset': { borderColor: c.accent },
      '&.Mui-focused fieldset': { borderColor: c.accent },
    },
  };

  const btnSx = {
    bgcolor: c.accent, color: c.accentText,
    borderRadius: '50px', px: 2.5, fontSize: '0.75rem', whiteSpace: 'nowrap',
    '&:hover': { bgcolor: c.accentHover },
    '&.Mui-disabled': { opacity: 0.4, bgcolor: c.accent, color: c.accentText },
    width: { xs: '100%', sm: 'auto' },
  };

  return (
    <Box sx={{ pt: `${tokens.spacing.topBarHeight + 24}px`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 720, mx: 'auto' }}>

      {/* My Friends */}
      <Box sx={{ mb: 4 }}>
        <SectionLabel text={`My Friends${friends.length > 0 ? ` (${friends.length})` : ''}`} />

        {!primaryName ? (
          <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary }}>
            Register a name to manage your friends list.
          </Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: addError || addSuccess ? 1 : 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1, position: 'relative' }}>
                <TextField
                  fullWidth size="small"
                  placeholder="Search by name…"
                  value={addInput}
                  onChange={e => {
                    const v = e.target.value;
                    setAddInput(v); setAddError(null); setAddSuccess(null);
                    if (v.length >= 2) {
                      searchNames(v).then(r => setAddSuggestions(r.slice(0, 6).map(x => x.name)));
                    } else {
                      setAddSuggestions([]);
                    }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { setAddSuggestions([]); void handleAdd(); } }}
                  onBlur={() => setTimeout(() => setAddSuggestions([]), 150)}
                  error={!!addError}
                  helperText={addError ?? undefined}
                  sx={inputSx}
                />
                {addSuggestions.length > 0 && (
                  <Box sx={{
                    position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5,
                    bgcolor: c.surface,
                    border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
                    borderRadius: `${tokens.shape.radius}px`,
                    zIndex: 10, overflow: 'hidden',
                  }}>
                    {addSuggestions.map((name, i) => (
                      <Box
                        key={name}
                        onMouseDown={() => { setAddInput(name); setAddSuggestions([]); }}
                        sx={{
                          px: 2, py: 1, cursor: 'pointer',
                          borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none',
                          '&:hover': { bgcolor: c.borderLight },
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          transition: '0.1s ease',
                        }}
                      >
                        <AvatarDisplay name={name} size={24} />
                        <Typography sx={{ fontSize: '0.85rem', color: c.textPrimary }}>{name}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
              <Button
                variant="contained" disableElevation
                disabled={addBusy || !addInput.trim()}
                onClick={() => { setAddSuggestions([]); void handleAdd(); }}
                startIcon={addBusy ? <CircularProgress size={14} sx={{ color: c.accentText }} /> : <PersonAddIcon />}
                sx={btnSx}
              >
                Add
              </Button>
            </Box>

            {addSuccess && (
              <Alert severity="success" sx={{ mb: 1.5, fontSize: '0.75rem', py: 0 }}>{addSuccess}</Alert>
            )}

            {friendsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} sx={{ color: c.accent }} />
              </Box>
            ) : friends.length === 0 && !pendingFriend ? (
              <Box sx={{ border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, p: 3, textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: '2rem', color: c.textSecondary, opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
                <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary }}>No friends yet. Add one above.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
                {pendingFriend && !friends.includes(pendingFriend) && (
                  <FriendTile
                    key="__pending__"
                    name={pendingFriend}
                    onRemove={handleRemovePending}
                    removing={removingName === pendingFriend}
                    pending
                  />
                )}
                {friends.map(name => (
                  <FriendTile
                    key={name}
                    name={name}
                    onRemove={() => handleRemove(name)}
                    removing={removingName === name}
                  />
                ))}
              </Box>
            )}
          </>
        )}
      </Box>

      <Box sx={{ height: '1px', bgcolor: c.borderLight, mb: 4 }} />

      {/* View someone's friends */}
      <Box>
        <SectionLabel text="View Someone's Friends" />
        <Box sx={{ display: 'flex', gap: 1, mb: viewError ? 1 : 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            fullWidth size="small"
            placeholder="Enter a name…"
            value={viewInput}
            onChange={e => { setViewInput(e.target.value); setViewError(null); }}
            onKeyDown={e => e.key === 'Enter' && handleViewSearch()}
            error={!!viewError}
            helperText={viewError ?? undefined}
            sx={inputSx}
          />
          <Button
            variant="contained" disableElevation
            disabled={viewLoading || !viewInput.trim()}
            onClick={handleViewSearch}
            startIcon={viewLoading ? <CircularProgress size={14} sx={{ color: c.accentText }} /> : <SearchIcon />}
            sx={btnSx}
          >
            View
          </Button>
        </Box>

        {viewTarget && !viewLoading && (
          <>
            <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary, mb: 1.5 }}>
              {viewFriends.length > 0
                ? `${viewTarget} has ${viewFriends.length} friend${viewFriends.length !== 1 ? 's' : ''}`
                : `${viewTarget} hasn't added any friends yet.`}
            </Typography>
            {viewFriends.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
                {viewFriends.map(name => (
                  <FriendTile key={name} name={name} />
                ))}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
