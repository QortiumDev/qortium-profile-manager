import { useState, useCallback } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GroupsIcon from '@mui/icons-material/Groups';
import BadgeIcon from '@mui/icons-material/Badge';
import StarsIcon from '@mui/icons-material/Stars';
import HardwareIcon from '@mui/icons-material/Hardware';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { AvatarDisplay } from '../components/profile/AvatarDisplay';
import { getNameData, fetchBio, getAccountData, getAccountNames, searchNames } from '../api/qortal';
import { fetchGroupsByMember } from '../api/rest';

// LEVEL_LABELS — un-comment to restore named level display in profile chips
// const LEVEL_LABELS: Record<number, string> = {
//   0: 'Unregistered', 1: 'Initiate', 2: 'Member', 3: 'Full Member',
//   4: 'Minter', 5: 'Mentor', 6: 'Architect', 7: 'Senior Architect',
//   8: 'Elder', 9: 'Grand Elder', 10: 'Grand Elder',
// };

interface ProfileResult {
  name: string;
  address: string;
  bio: string | null;
  level: number;
  blocksMinted: number;
  groupCount: number;
  nameCount: number;
  description?: string;
}

function ProfileCard({ profile }: { profile: ProfileResult }) {
  const c = useColors();
  return (
    <Box
      sx={{
        border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        borderRadius: `${tokens.shape.radius}px`,
        bgcolor: c.surface,
        p: 3,
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2.5, alignItems: 'flex-start', mb: profile.bio ? 2.5 : 0 }}>
        <AvatarDisplay name={profile.name} size={72} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '1.15rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, mb: 0.25 }}>
            {profile.name}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary, fontFamily: 'monospace', mb: 1, wordBreak: 'break-all' }}>
            {profile.address}
          </Typography>
          {profile.description && (
            <Typography sx={{ fontSize: '0.8rem', color: c.textSecondary, mb: 1, fontStyle: 'italic' }}>
              {profile.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Chip
              icon={<StarsIcon sx={{ fontSize: '0.85rem !important' }} />}
              label={`Level ${profile.level}`}
              size="small"
              sx={{ fontSize: '0.7rem', bgcolor: c.borderLight, color: c.textSecondary, border: 'none' }}
            />
            <Chip
              icon={<HardwareIcon sx={{ fontSize: '0.85rem !important' }} />}
              label={`${profile.blocksMinted.toLocaleString()} blocks`}
              size="small"
              sx={{ fontSize: '0.7rem', bgcolor: c.borderLight, color: c.textSecondary, border: 'none' }}
            />
            <Chip
              icon={<GroupsIcon sx={{ fontSize: '0.85rem !important' }} />}
              label={`${profile.groupCount} group${profile.groupCount !== 1 ? 's' : ''}`}
              size="small"
              sx={{ fontSize: '0.7rem', bgcolor: c.borderLight, color: c.textSecondary, border: 'none' }}
            />
            <Chip
              icon={<BadgeIcon sx={{ fontSize: '0.85rem !important' }} />}
              label={`${profile.nameCount} name${profile.nameCount !== 1 ? 's' : ''}`}
              size="small"
              sx={{ fontSize: '0.7rem', bgcolor: c.borderLight, color: c.textSecondary, border: 'none' }}
            />
          </Box>
        </Box>
      </Box>

      {profile.bio && (
        <>
          <Box sx={{ height: '1px', bgcolor: c.borderLight, mb: 2.5 }} />
          <Typography sx={{ fontSize: '0.85rem', color: c.textPrimary, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {profile.bio}
          </Typography>
        </>
      )}
    </Box>
  );
}

interface SuggestionItem { name: string; owner: string }

export function ViewProfilePage() {
  const c = useColors();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const suggest = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    const results = await searchNames(q);
    setSuggestions(results.slice(0, 6));
  }, []);

  async function loadProfile(name: string) {
    setLoadingProfile(true);
    setProfile(null);
    setNotFound(false);
    setSuggestions([]);
    try {
      const nameData = await getNameData(name);
      if (!nameData) { setNotFound(true); setLoadingProfile(false); return; }

      const [acct, bio, names, groups] = await Promise.allSettled([
        getAccountData(nameData.owner),
        fetchBio(name),
        getAccountNames(nameData.owner),
        fetchGroupsByMember(nameData.owner).catch(() => []),
      ]);

      setProfile({
        name,
        address: nameData.owner,
        description: nameData.description,
        bio: bio.status === 'fulfilled' ? bio.value : null,
        level: acct.status === 'fulfilled' && acct.value ? acct.value.level : 0,
        blocksMinted: acct.status === 'fulfilled' && acct.value
          ? acct.value.blocksMinted + (acct.value.blocksMintedAdjustment ?? 0) - (acct.value.blocksMintedPenalty ?? 0)
          : 0,
        groupCount: groups.status === 'fulfilled' ? (groups.value as unknown[]).length : 0,
        nameCount: names.status === 'fulfilled' ? names.value.length : 1,
      });
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    await loadProfile(q);
    setSearching(false);
  }

  return (
    <Box sx={{ pt: `${tokens.spacing.topBarHeight + 24}px`, pb: 4, px: { xs: 2, md: 4 }, maxWidth: 720, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 0.5 }}>
          View Profile
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary }}>
          Search any registered name
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter a name…"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              void suggest(e.target.value);
            }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.9rem',
                '& fieldset': { borderColor: c.borderLight },
                '&:hover fieldset': { borderColor: c.accent },
                '&.Mui-focused fieldset': { borderColor: c.accent },
              },
            }}
          />
          <Button
            variant="contained"
            disableElevation
            disabled={searching || !query.trim()}
            onClick={handleSearch}
            startIcon={searching ? <CircularProgress size={14} sx={{ color: c.accentText }} /> : <SearchIcon />}
            sx={{
              bgcolor: c.accent,
              color: c.accentText,
              borderRadius: '50px',
              px: 2.5,
              '&:hover': { bgcolor: c.accentHover },
              '&.Mui-disabled': { opacity: 0.4, bgcolor: c.accent, color: c.accentText },
              whiteSpace: 'nowrap',
              fontSize: '0.75rem',
            }}
          >
            Search
          </Button>
        </Box>

        {suggestions.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 0.5,
              bgcolor: c.surface,
              border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
              borderRadius: `${tokens.shape.radius}px`,
              zIndex: 10,
              overflow: 'hidden',
            }}
          >
            {suggestions.map((s, i) => (
              <Box
                key={s.name}
                onClick={() => { setQuery(s.name); setSuggestions([]); void loadProfile(s.name); }}
                sx={{
                  px: 2, py: 1.25,
                  cursor: 'pointer',
                  borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none',
                  '&:hover': { bgcolor: c.borderLight },
                  transition: '0.12s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <AvatarDisplay name={s.name} size={28} />
                <Typography sx={{ fontSize: '0.85rem', color: c.textPrimary }}>
                  {s.name}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {loadingProfile && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} sx={{ color: c.accent }} />
        </Box>
      )}

      {notFound && !loadingProfile && (
        <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary, textAlign: 'center', py: 4 }}>
          No profile found for "{query}".
        </Typography>
      )}

      {profile && !loadingProfile && <ProfileCard profile={profile} />}
    </Box>
  );
}
