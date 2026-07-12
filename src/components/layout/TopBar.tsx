import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Box, IconButton, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PersonRemoveAlt1Icon from '@mui/icons-material/PersonRemoveAlt1';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate, useLocation } from 'react-router-dom';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { themeAtom, uiStyleAtom } from '../../state/atoms';
import { EnumTheme } from '../../types';
import { RatingControl } from './RatingControl';

const APP_QDN_NAME = 'Profile';
const APP_QDN_IDENTIFIER = 'Profile';

function NavLink({
  label,
  to,
  active,
  isClassic,
}: {
  label: string;
  to: string;
  active: boolean;
  isClassic: boolean;
}) {
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
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        px: isClassic ? 1 : 0.5,
        py: isClassic ? 0.75 : 0,
        borderRadius: isClassic ? `${tokens.shape.radiusMd}px` : 0,
        borderBottom: active && !isClassic ? `2px solid ${c.accent}` : '2px solid transparent',
        bgcolor: active && isClassic ? c.controlSelected : 'transparent',
        lineHeight: isClassic ? 1.2 : `${tokens.spacing.topBarHeight - 4}px`,
        '&:hover': { color: c.textPrimary, bgcolor: isClassic ? c.controlHover : 'transparent' },
        transition: c.transitionControl,
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
  const uiStyle = useAtomValue(uiStyleAtom);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const headerRef = useRef<HTMLElement | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const isClassic = uiStyle === 'classic';

  useEffect(() => {
    qdnRequest({ action: 'GET_LIST', listName: 'followedNames' })
      .then((list) => { setIsFollowed(Array.isArray(list) && (list as string[]).includes(APP_QDN_NAME)); })
      .catch(() => {});
  }, []);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeight = () => {
      document.documentElement.style.setProperty(
        '--profile-top-bar-height',
        `${header.getBoundingClientRect().height}px`,
      );
    };

    updateHeight();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isClassic]);

  async function handleToggleFollow() {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowed) {
        await qdnRequest({ action: 'REMOVE_FROM_LIST', listName: 'followedNames', items: [APP_QDN_NAME] });
        setIsFollowed(false);
      } else {
        await qdnRequest({ action: 'ADD_TO_LIST', listName: 'followedNames', items: [APP_QDN_NAME] });
        setIsFollowed(true);
      }
    } catch {}
    setFollowBusy(false);
  }

  function handleOpenHelp() {
    void qdnRequest({ action: 'OPEN_NEW_TAB', address: `qdn://APP/Help/Help?new=${APP_QDN_NAME}` });
  }

  function handleToggleTheme() {
    setTheme(current => {
      const next = current === EnumTheme.DARK ? EnumTheme.LIGHT : EnumTheme.DARK;
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      return next;
    });
  }

  const buttonSx = {
    borderRadius: `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    p: 0,
    color: c.textSecondary,
    '&:hover': { color: c.accent, bgcolor: isClassic ? c.controlHover : c.borderLight },
    transition: c.transitionControl,
  };

  return (
    <Box
      component="header"
      ref={headerRef}
      sx={{
        position: 'fixed', top: 0, left: 0, right: 0,
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        overflow: 'hidden',
        height: isClassic ? 'auto' : tokens.spacing.topBarHeight,
        minHeight: isClassic ? 'auto' : tokens.spacing.topBarHeight,
        bgcolor: c.surface,
        borderBottom: `${isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic ? c.border : c.borderLight}`,
        boxShadow: isClassic ? c.topBarShadow : 'none',
        display: 'grid',
        gridTemplateColumns: isClassic
          ? { xs: 'minmax(0, 1fr) auto', sm: 'auto minmax(0, 1fr) auto' }
          : 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        px: isClassic ? { xs: 1.25, sm: 1.75 } : 2,
        py: isClassic ? 1 : 0,
        gap: isClassic ? 1.25 : 1.5,
        zIndex: 100,
      }}
    >
      <Box
        onClick={() => navigate('/')}
        sx={{
          fontWeight: tokens.typography.weightBlack,
          fontSize: '1rem',
          color: c.textPrimary,
          cursor: 'pointer',
          '&:hover': { color: c.accent },
          transition: c.transitionControl,
          userSelect: 'none',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        Profile
      </Box>

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isClassic ? { xs: 'center', sm: 'flex-start' } : 'flex-start',
        flexWrap: isClassic ? { xs: 'wrap', sm: 'nowrap' } : 'nowrap',
        gap: isClassic ? 0.5 : 1.5,
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        gridColumn: isClassic ? { xs: '1 / -1', sm: 'auto' } : 'auto',
        gridRow: isClassic ? { xs: 2, sm: 'auto' } : 'auto',
      }}>
        <NavLink label="Profile" to="/" active={pathname === '/'} isClassic={isClassic} />
        <NavLink label="Friends" to="/friends" active={pathname === '/friends'} isClassic={isClassic} />
      </Box>

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: isClassic ? 0.5 : 0,
        gridColumn: isClassic ? { xs: 2, sm: 'auto' } : 'auto',
        gridRow: isClassic ? { xs: 1, sm: 'auto' } : 'auto',
      }}>
        <RatingControl qdnName={APP_QDN_NAME} identifier={APP_QDN_IDENTIFIER} />

        <Tooltip title={isFollowed ? 'Stop following this app' : 'Follow this app'} placement="bottom">
          <IconButton
            size="small"
            onClick={() => void handleToggleFollow()}
            disabled={followBusy}
            sx={{ ...buttonSx, color: isFollowed ? c.accent : c.textSecondary }}
          >
            {isFollowed ? <PersonRemoveAlt1Icon fontSize="small" /> : <PersonAddAlt1Icon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Help & Feedback" placement="bottom">
          <IconButton size="small" onClick={handleOpenHelp} sx={buttonSx}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={theme === EnumTheme.DARK ? 'Light mode' : 'Dark mode'} placement="bottom">
          <IconButton onClick={handleToggleTheme} sx={buttonSx}>
            {theme === EnumTheme.DARK ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
