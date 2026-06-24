import { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { registerName, updateName, ensureAccountUnlocked } from '../../api/qortal';
import type { QortalName } from '../../types';

interface Props {
  names: QortalName[];
  onRefresh: () => void;
}

export function NameManager({ names, onRefresh }: Props) {
  const c = useColors();
  const [registerInput, setRegisterInput] = useState('');
  const [updateInput, setUpdateInput] = useState('');
  const [busyRegister, setBusyRegister] = useState(false);
  const [busyUpdate, setBusyUpdate] = useState(false);
  const [registerStatus, setRegisterStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const primaryName = names[0] ?? null;
  const hasPrimary = !!primaryName;

  async function handleRegister() {
    const trimmed = registerInput.trim();
    if (!trimmed) return;
    setBusyRegister(true);
    setRegisterStatus(null);
    try {
      if (!await ensureAccountUnlocked()) return;
      await registerName(trimmed);
      setRegisterStatus({ type: 'success', msg: `"${trimmed}" registered.` });
      setRegisterInput('');
      onRefresh();
    } catch (e) {
      setRegisterStatus({ type: 'error', msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyRegister(false);
    }
  }

  async function handleUpdate() {
    const trimmed = updateInput.trim();
    if (!trimmed || !primaryName) return;
    setBusyUpdate(true);
    setUpdateStatus(null);
    try {
      if (!await ensureAccountUnlocked()) return;
      await updateName(primaryName.name, trimmed);
      setUpdateStatus({ type: 'success', msg: `Name updated to "${trimmed}".` });
      setUpdateInput('');
      onRefresh();
    } catch (e) {
      setUpdateStatus({ type: 'error', msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyUpdate(false);
    }
  }

  return (
    <Box
      sx={{
        border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        borderRadius: `${tokens.shape.radius}px`,
        bgcolor: c.surface,
        overflow: 'hidden',
      }}
    >
      {/* Current names */}
      <Box sx={{ px: 3, pt: 3, pb: hasPrimary ? 2.5 : 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <BadgeIcon sx={{ fontSize: '1rem', color: c.textSecondary }} />
          <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary }}>
            Registered Names
          </Typography>
        </Box>
        {hasPrimary ? (
          <Box>
            {names.map((n, i) => (
              <Typography key={n.name} sx={{ fontSize: i === 0 ? '1.2rem' : '0.85rem', fontWeight: i === 0 ? tokens.typography.weightBold : tokens.typography.weightRegular, color: i === 0 ? c.textPrimary : c.textSecondary, lineHeight: 1.4 }}>
                {n.name}
              </Typography>
            ))}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '0.8rem', color: c.textSecondary }}>No name registered yet.</Typography>
        )}
      </Box>

      <Box sx={{ height: '1px', bgcolor: c.borderLight }} />

      {/* Register new name */}
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 1.5 }}>
          Add New Name
        </Typography>
        {registerStatus && (
          <Alert severity={registerStatus.type} sx={{ mb: 1.5, fontSize: '0.78rem', py: 0 }}>
            {registerStatus.msg}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <TextField
            size="small"
            placeholder="Choose a name…"
            value={registerInput}
            onChange={e => setRegisterInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRegister()}
            fullWidth
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
            variant="contained"
            onClick={handleRegister}
            disabled={busyRegister || !registerInput.trim()}
            disableElevation
            sx={{
              bgcolor: c.accent, color: c.accentText, borderRadius: '50px', px: 2.5,
              '&:hover': { bgcolor: c.accentHover },
              '&.Mui-disabled': { opacity: 0.4, bgcolor: c.accent, color: c.accentText },
              whiteSpace: 'nowrap', fontSize: '0.75rem',
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {busyRegister ? <CircularProgress size={14} sx={{ color: c.accentText }} /> : 'Register'}
          </Button>
        </Box>
      </Box>

      {/* Update primary name — only shown once a name exists */}
      {hasPrimary && (
        <>
          <Box sx={{ height: '1px', bgcolor: c.borderLight }} />
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary, mb: 1.5 }}>
              Update Primary Name
            </Typography>
            <Box
              sx={{
                display: 'flex', alignItems: 'flex-start', gap: 1,
                bgcolor: `${c.error}18`,
                border: `1px solid ${c.error}55`,
                borderRadius: `${tokens.shape.radius}px`,
                px: 1.5, py: 1,
                mb: 1.5,
              }}
            >
              <WarningAmberIcon sx={{ fontSize: '0.9rem', color: c.error, mt: '1px', flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.75rem', color: c.error, lineHeight: 1.5 }}>
                Renaming <strong>{primaryName.name}</strong> is permanent and cannot be undone. The old name will be released.
              </Typography>
            </Box>
            {updateStatus && (
              <Alert severity={updateStatus.type} sx={{ mb: 1.5, fontSize: '0.78rem', py: 0 }}>
                {updateStatus.msg}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
              <TextField
                size="small"
                placeholder="Permanent change — irreversible"
                value={updateInput}
                onChange={e => setUpdateInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.85rem',
                    '& fieldset': { borderColor: `${c.error}55` },
                    '&:hover fieldset': { borderColor: c.error },
                    '&.Mui-focused fieldset': { borderColor: c.error },
                  },
                  '& input::placeholder': { color: c.error, opacity: 0.6 },
                }}
              />
              <Button
                variant="contained"
                onClick={handleUpdate}
                disabled={busyUpdate || !updateInput.trim()}
                disableElevation
                sx={{
                  bgcolor: c.error, color: '#fff', borderRadius: '50px', px: 2.5,
                  '&:hover': { bgcolor: '#c0392b' },
                  '&.Mui-disabled': { opacity: 0.4, bgcolor: c.error, color: '#fff' },
                  whiteSpace: 'nowrap', fontSize: '0.75rem',
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                {busyUpdate ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Update'}
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
