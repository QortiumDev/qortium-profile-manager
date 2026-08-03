import { useState } from 'react';
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BadgeIcon from '@mui/icons-material/Badge';
import GroupsIcon from '@mui/icons-material/Groups';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import NotesIcon from '@mui/icons-material/Notes';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HubIcon from '@mui/icons-material/Hub';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { openApp } from '../../apps';

const SKIP_KEY = 'pm-onboarding-skipped';

function loadSkipped(): string[] {
  try {
    const raw = localStorage.getItem(SKIP_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

function saveSkipped(ids: string[]) {
  localStorage.setItem(SKIP_KEY, JSON.stringify(ids));
}

interface Item {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  done: boolean;
  actionLabel: string;
  onAction: () => void;
}

interface Props {
  hasName: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
  hasStatus: boolean;
  hasFriends: boolean;
  hasJoinedGroup: boolean;
  hasWalletCard: boolean;
  hasFollowedNode: boolean;
  onScrollToNameManager: () => void;
  onScrollToProfileCard: () => void;
  onGoToFriends: () => void;
  onClose: () => void;
}

export function OnboardingChecklist({
  hasName, hasAvatar, hasBio, hasStatus, hasFriends, hasJoinedGroup, hasWalletCard, hasFollowedNode,
  onScrollToNameManager, onScrollToProfileCard, onGoToFriends, onClose,
}: Props) {
  const c = useColors();
  const [skipped, setSkipped] = useState<string[]>(loadSkipped);

  function skip(id: string) {
    const next = [...new Set([...skipped, id])];
    setSkipped(next);
    saveSkipped(next);
  }

  function restore(id: string) {
    const next = skipped.filter(x => x !== id);
    setSkipped(next);
    saveSkipped(next);
  }

  const items: Item[] = [
    {
      id: 'register-name',
      icon: <BadgeIcon fontSize="small" />,
      label: 'Register a name',
      description: "Your name is your identity on Qortium, and it's required before you can publish anything to QDN. Confirming can take a minute or two to fully hit the network, so feel free to jump to the next step while you wait.",
      done: hasName,
      actionLabel: 'Register',
      onAction: onScrollToNameManager,
    },
    {
      id: 'join-groups',
      icon: <GroupsIcon fontSize="small" />,
      label: 'Join chat groups',
      description: "Groups are where the community talks. This doesn't depend on your name being confirmed yet, so it's a good way to spend the next minute or two.",
      done: hasJoinedGroup,
      actionLabel: 'Browse groups',
      onAction: () => void openApp('groups', '/browse'),
    },
    {
      id: 'avatar',
      icon: <PhotoCameraIcon fontSize="small" />,
      label: 'Publish an avatar',
      description: 'Add a picture so people recognize you around the network. This publishes to QDN, so your name needs to be confirmed first.',
      done: hasAvatar,
      actionLabel: 'Add photo',
      onAction: onScrollToProfileCard,
    },
    {
      id: 'bio',
      icon: <NotesIcon fontSize="small" />,
      label: 'Set a bio',
      description: 'A short line about who you are, published under your name alongside your avatar.',
      done: hasBio,
      actionLabel: 'Add bio',
      onAction: onScrollToProfileCard,
    },
    {
      id: 'status',
      icon: <ChatBubbleOutlineIcon fontSize="small" />,
      label: 'Set a status',
      description: "A quick note about what you're up to right now, shown on your profile card.",
      done: hasStatus,
      actionLabel: 'Add status',
      onAction: onScrollToProfileCard,
    },
    {
      id: 'friends',
      icon: <PeopleIcon fontSize="small" />,
      label: 'Add friends',
      description: "Add people you know to your public friends list. It's one-directional and visible to anyone, and it's what powers the friend activity feed on your profile.",
      done: hasFriends,
      actionLabel: 'Add friends',
      onAction: onGoToFriends,
    },
    {
      id: 'wallet-card',
      icon: <AccountBalanceWalletIcon fontSize="small" />,
      label: 'Publish a wallet card',
      description: 'Publish a public wallet card so others can send you any of the various supported crypto coins without asking for your address every time. Manageable from here or directly in the Wallet app.',
      done: hasWalletCard,
      actionLabel: 'Open Wallet',
      onAction: () => void openApp('wallet', '/contacts'),
    },
    {
      id: 'follow-nodes',
      icon: <HubIcon fontSize="small" />,
      label: 'Follow other nodes',
      description: "Following someone updates a follow/block list stored locally on your own machine, telling your node to prioritize propagating their data across the network. This one's entirely local and isn't required for anything else on this list.",
      done: hasFollowedNode,
      actionLabel: 'Open Curate',
      onAction: () => void openApp('curate'),
    },
  ];

  return (
    <Box
      sx={{
        border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        borderRadius: `${tokens.shape.radius}px`,
        bgcolor: c.surface,
        mb: 3,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', px: 3, pt: 2.5, pb: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, mb: 0.5 }}>
            Getting started
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary, lineHeight: 1.5 }}>
            Everything below is optional - just some suggestions to help you get going. Skip or dismiss anything you don't need, and come back anytime.
          </Typography>
        </Box>
        <Tooltip title="Hide this checklist">
          <IconButton size="small" onClick={onClose} sx={{ color: c.textSecondary, '&:hover': { color: c.accent }, mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ height: '1px', bgcolor: c.borderLight }} />

      {items.map((item, i) => {
        const isSkipped = !item.done && skipped.includes(item.id);
        return (
          <Box key={item.id}>
            {i > 0 && <Box sx={{ height: '1px', bgcolor: c.borderLight }} />}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 3, py: 2, opacity: isSkipped ? 0.5 : 1 }}>
              <Box sx={{ color: item.done ? c.success : c.textSecondary, mt: '2px', flexShrink: 0 }}>
                {item.done ? <CheckCircleIcon fontSize="small" /> : item.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{
                  fontSize: '0.85rem', fontWeight: tokens.typography.weightMedium, color: c.textPrimary,
                  textDecoration: isSkipped ? 'line-through' : 'none',
                }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: c.textSecondary, lineHeight: 1.5, mt: 0.25 }}>
                  {item.description}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                {item.done ? (
                  <Typography sx={{ fontSize: '0.72rem', color: c.success, fontWeight: tokens.typography.weightMedium, px: 1 }}>
                    Done
                  </Typography>
                ) : isSkipped ? (
                  <Tooltip title="Show again">
                    <IconButton size="small" onClick={() => restore(item.id)} sx={{ color: c.textSecondary, '&:hover': { color: c.accent } }}>
                      <RestartAltIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={item.onAction}
                      sx={{
                        borderColor: c.accent, color: c.accent, borderRadius: '50px', px: 1.75, fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        '&:hover': { bgcolor: c.borderLight },
                      }}
                    >
                      {item.actionLabel}
                    </Button>
                    <Tooltip title="Skip this">
                      <IconButton size="small" onClick={() => skip(item.id)} sx={{ color: c.textSecondary, '&:hover': { color: c.accent } }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
