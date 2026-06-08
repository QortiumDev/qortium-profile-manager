import { ReactNode, useState } from 'react';
import { Box, Collapse, Tooltip, Typography, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';

interface Props {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
  loading?: boolean;
  expand?: ReactNode;
  onAction?: () => void;
  actionLabel?: string;
}

export function StatCard({ label, value, sub, icon, accent, loading, expand, onAction, actionLabel }: Props) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const clickable = (!!expand || !!onAction) && !loading;

  const inner = (
    <>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            {icon && <Box sx={{ color: c.textSecondary, display: 'flex', fontSize: '1rem' }}>{icon}</Box>}
            <Typography sx={{ fontSize: '0.65rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.textSecondary }}>
              {label}
            </Typography>
          </Box>

          {loading ? (
            <CircularProgress size={20} sx={{ color: c.accent, mt: 0.5 }} />
          ) : (
            <>
              <Typography sx={{ fontSize: '1.75rem', fontWeight: tokens.typography.weightBlack, letterSpacing: '-0.02em', color: accent ? c.accent : c.textPrimary, lineHeight: 1 }}>
                {value}
              </Typography>
              {sub && (
                <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary, mt: 0.75 }}>
                  {sub}
                </Typography>
              )}
            </>
          )}
        </Box>

        {clickable && (
          onAction
            ? <OpenInNewIcon sx={{ color: c.textSecondary, fontSize: '0.9rem', flexShrink: 0, mt: 0.25 }} />
            : <ExpandMoreIcon sx={{ color: c.textSecondary, fontSize: '1.1rem', flexShrink: 0, mt: 0.25, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.15s ease' }} />
        )}
      </Box>

      {expand && (
        <Collapse in={open}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${c.borderLight}`, maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
            {expand}
          </Box>
        </Collapse>
      )}
    </>
  );

  const boxSx = {
    border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
    borderRadius: `${tokens.shape.radius}px`,
    bgcolor: c.surface,
    p: 2.5,
    cursor: clickable ? 'pointer' : 'default',
    transition: '0.15s ease',
    '&:hover': clickable ? { bgcolor: c.borderLight } : {},
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  };

  if (actionLabel && onAction) {
    return (
      <Tooltip title={`Open in ${actionLabel}?`} placement="top" arrow PopperProps={{ disablePortal: true }}>
        <Box onClick={onAction} sx={boxSx}>{inner}</Box>
      </Tooltip>
    );
  }

  return (
    <Box onClick={clickable ? () => setOpen(o => !o) : undefined} sx={boxSx}>
      {inner}
    </Box>
  );
}
