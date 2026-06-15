import { useAtom } from 'jotai';
import { Box, IconButton, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useNavigate, useLocation } from 'react-router-dom';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { themeAtom } from '../../state/atoms';
import { EnumTheme } from '../../types';

function NavLink({ label, to, active }: { label: string; to: string; active: boolean }) {
  const c = useColors();
  const navigate = useNavigate();
  return (
    <Box
      onClick={() => navigate(to)}
      sx={{
        fontSize: '0.78rem',
        fontWeight: tokens.typography.weightMedium,
        color: active ? c.textPrimary : c.textSecondary,
        cursor: 'pointer',
        px: 0.5,
        pb: '2px',
        borderBottom: active ? `2px solid ${c.accent}` : '2px solid transparent',
        lineHeight: `${tokens.spacing.topBarHeight - 4}px`,
        '&:hover': { color: c.textPrimary },
        transition: 'color 0.15s ease, border-color 0.15s ease',
        userSelect: 'none',
      }}
    >
      {label}
    </Box>
  );
}

export function TopBar() {
  const c = useColors();
  const [theme, setTheme] = useAtom(themeAtom);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Box
      component="header"
      sx={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: tokens.spacing.topBarHeight,
        bgcolor: c.surface,
        borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        display: 'flex', alignItems: 'center',
        px: 2, gap: 1.5, zIndex: 100,
      }}
    >
      <Box
        onClick={() => navigate('/')}
        sx={{ fontWeight: tokens.typography.weightBlack, fontSize: '1rem', color: c.textPrimary, letterSpacing: '-0.01em', mr: 1, cursor: 'pointer', '&:hover': { color: c.accent }, transition: '0.15s ease', userSelect: 'none' }}
      >
        Profile
      </Box>

      <NavLink label="Profile" to="/" active={pathname === '/'} />
      <NavLink label="Friends" to="/friends" active={pathname === '/friends'} />

      <Box sx={{ ml: 'auto' }}>
        <Tooltip title={theme === EnumTheme.DARK ? 'Light mode' : 'Dark mode'} placement="bottom">
          <IconButton
            onClick={() => setTheme(t => t === EnumTheme.DARK ? EnumTheme.LIGHT : EnumTheme.DARK)}
            sx={{
              borderRadius: `${tokens.shape.radius}px`,
              minWidth: 44, minHeight: 44,
              color: c.textSecondary,
              '&:hover': { color: c.accent, bgcolor: c.borderLight },
              transition: '0.15s ease',
            }}
          >
            {theme === EnumTheme.DARK ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
