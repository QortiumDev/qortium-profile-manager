import { useState, useEffect } from 'react';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { AvatarDisplay } from '../profile/AvatarDisplay';
import { fetchStatus } from '../../api/qortal';

interface FriendTileProps {
  name: string;
  onClick?: () => void;
  onRemove?: () => void;
  removing?: boolean;
  pending?: boolean;
}

export function FriendTile({ name, onClick, onRemove, removing, pending }: FriendTileProps) {
  const c = useColors();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus(name).then(setStatus);
  }, [name]);

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        border: `${tokens.shape.borderWidth} solid ${pending ? c.accent : c.borderLight}`,
        borderRadius: `${tokens.shape.radius}px`,
        bgcolor: c.surface,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        opacity: removing ? 0.5 : 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'opacity 0.15s ease, border-color 0.15s ease',
        ...(pending && {
          '@keyframes pulse-border': {
            '0%, 100%': { borderColor: c.accent },
            '50%': { borderColor: c.borderLight },
          },
          animation: 'pulse-border 1.8s ease-in-out infinite',
        }),
        ...(!pending && onClick && { '&:hover': { borderColor: c.accent } }),
      }}
    >
      <AvatarDisplay name={name} size={40} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: '0.82rem',
          fontWeight: tokens.typography.weightBold,
          color: c.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {name}
        </Typography>
        <Typography sx={{
          fontSize: '0.72rem',
          color: c.textSecondary,
          fontStyle: status ? 'italic' : 'normal',
          opacity: status ? 1 : 0.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {status ?? 'no status'}
        </Typography>
        {pending && (
          <Typography sx={{ fontSize: '0.65rem', color: c.accent, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <CircularProgress size={8} sx={{ color: c.accent }} />
            confirming…
          </Typography>
        )}
      </Box>
      {onRemove && (
        removing
          ? <CircularProgress size={14} sx={{ color: c.textSecondary, flexShrink: 0 }} />
          : (
            <IconButton
              size="small"
              onClick={e => { e.stopPropagation(); onRemove(); }}
              sx={{ color: c.textSecondary, '&:hover': { color: c.error }, p: 0.25, flexShrink: 0 }}
            >
              <CloseIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          )
      )}
    </Box>
  );
}
