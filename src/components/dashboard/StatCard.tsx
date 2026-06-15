import { ReactNode, useState } from 'react';
import { Box, Collapse, Typography, CircularProgress } from '@mui/material';
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
  href?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function StatCard({ label, value, sub, icon, accent, loading, expand, href, onAction, actionLabel }: Props) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isLink   = (!!href || !!onAction) && !!actionLabel;
  const isExpand = !!expand && !isLink && !loading;

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

          {isLink && (
            <Typography sx={{
              fontSize: '0.65rem',
              color: c.accent,
              mt: 0.75,
              visibility: hovered ? 'visible' : 'hidden',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}>
              Open in {actionLabel} →
            </Typography>
          )}
        </Box>

        {(isLink || isExpand) && (
          isLink
            ? <OpenInNewIcon sx={{ color: c.accent, fontSize: '0.9rem', flexShrink: 0, mt: 0.25, opacity: hovered ? 1 : 0.2, transition: 'opacity 0.15s ease' }} />
            : <ExpandMoreIcon sx={{ color: c.textSecondary, fontSize: '1.1rem', flexShrink: 0, mt: 0.25, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.15s ease' }} />
        )}
      </Box>

      {isExpand && (
        <Collapse in={open}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${c.borderLight}`, maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
            {expand}
          </Box>
        </Collapse>
      )}
    </>
  );

  const baseStyle: React.CSSProperties = {
    border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
    borderRadius: `${tokens.shape.radius}px`,
    backgroundColor: hovered && isLink ? c.borderLight : c.surface,
    padding: '20px',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    transition: 'background-color 0.15s ease',
    display: 'block',
    color: 'inherit',
    cursor: isLink ? 'pointer' : isExpand ? 'pointer' : 'default',
    textDecoration: 'none',
    outline: 'none',
  };

  if (isLink && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={baseStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {inner}
      </a>
    );
  }

  if (isLink && onAction) {
    return (
      <button
        type="button"
        onClick={onAction}
        style={baseStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {inner}
      </button>
    );
  }

  if (isExpand) {
    return (
      <Box onClick={() => setOpen(o => !o)} sx={{ ...baseStyle as object, '&:hover': { bgcolor: c.borderLight } }}>
        {inner}
      </Box>
    );
  }

  return (
    <Box sx={{ ...baseStyle as object }}>
      {inner}
    </Box>
  );
}
