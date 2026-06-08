import { useState, useRef } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import NotesIcon from '@mui/icons-material/Notes';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { publishBio, publishAvatar } from '../../api/qortal';
import { AvatarDisplay } from './AvatarDisplay';

interface Props {
  name: string | null;
  initialBio: string | null;
  onAvatarPublished: () => void;
}

export function BioEditor({ name, initialBio, onAvatarPublished }: Props) {
  const c = useColors();
  const [bio, setBio] = useState(initialBio ?? '');
  const [busyBio, setBusyBio] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [bioStatus, setBioStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const disabled = !name;

  async function saveBio() {
    if (!name) return;
    setBusyBio(true);
    setBioStatus(null);
    try {
      await publishBio(name, bio);
      setBioStatus({ type: 'success', msg: 'Bio saved.' });
    } catch (e) {
      setBioStatus({ type: 'error', msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyBio(false);
    }
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !name) return;
    setBusyAvatar(true);
    setAvatarStatus(null);
    try {
      await publishAvatar(name, file);
      setAvatarStatus({ type: 'success', msg: 'Avatar updated.' });
      onAvatarPublished();
    } catch (err) {
      setAvatarStatus({ type: 'error', msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusyAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Avatar */}
      <Box
        sx={{
          border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
          borderRadius: `${tokens.shape.radius}px`,
          bgcolor: c.surface,
          p: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2.5,
        }}
      >
        <AvatarDisplay name={name} size={80} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 1 }}>
            Avatar
          </Typography>
          {avatarStatus && (
            <Alert severity={avatarStatus.type} sx={{ mb: 1.5, fontSize: '0.78rem', py: 0 }}>
              {avatarStatus.msg}
            </Alert>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
          <Button
            variant="outlined"
            size="small"
            disabled={disabled || busyAvatar}
            onClick={() => fileInputRef.current?.click()}
            startIcon={busyAvatar ? <CircularProgress size={12} /> : <PhotoCameraIcon />}
            sx={{
              borderColor: c.accent,
              color: c.accent,
              borderRadius: '50px',
              fontSize: '0.72rem',
              '&:hover': { bgcolor: c.borderLight },
              '&.Mui-disabled': { opacity: 0.4 },
            }}
          >
            {busyAvatar ? 'Uploading…' : 'Upload photo'}
          </Button>
          {disabled && (
            <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary, mt: 0.75 }}>
              Register a name first
            </Typography>
          )}
        </Box>
      </Box>

      {/* Bio */}
      <Box
        sx={{
          border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
          borderRadius: `${tokens.shape.radius}px`,
          bgcolor: c.surface,
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <NotesIcon sx={{ fontSize: '1rem', color: c.textSecondary }} />
          <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary }}>
            Bio
          </Typography>
        </Box>
        {bioStatus && (
          <Alert severity={bioStatus.type} sx={{ mb: 2, fontSize: '0.78rem' }}>
            {bioStatus.msg}
          </Alert>
        )}
        <TextField
          multiline
          rows={4}
          fullWidth
          disabled={disabled}
          placeholder={disabled ? 'Register a name to add a bio…' : 'Write something about yourself…'}
          value={bio}
          onChange={e => setBio(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              fontSize: '0.85rem',
              '& fieldset': { borderColor: c.borderLight },
              '&:hover fieldset': { borderColor: c.accent },
              '&.Mui-focused fieldset': { borderColor: c.accent },
            },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            disabled={disabled || busyBio}
            disableElevation
            onClick={saveBio}
            startIcon={busyBio ? <CircularProgress size={14} sx={{ color: c.accentText }} /> : <NotesIcon />}
            sx={{
              bgcolor: c.accent,
              color: c.accentText,
              borderRadius: '50px',
              fontSize: '0.75rem',
              '&:hover': { bgcolor: c.accentHover },
              '&.Mui-disabled': { opacity: 0.4, bgcolor: c.accent, color: c.accentText },
            }}
          >
            {busyBio ? 'Saving…' : 'Save bio'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
