import { useEffect, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { AvatarDisplay } from '../profile/AvatarDisplay';
import { fetchBio, fetchStatus, getQdnResourceUrl, openMediaPlayer } from '../../api/qortal';
import type { FeedItem as FeedItemData } from '../../lib/feedItem';

interface Props {
  item: FeedItemData;
  onSelectName?: (name: string) => void;
}

function formatTimestamp(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function FeedItemRow({ item, onSelectName }: Props) {
  return item.kind === 'profile-update'
    ? <ProfileUpdateRow item={item} onSelectName={onSelectName} />
    : <ContentCard item={item} onSelectName={onSelectName} />;
}

function ProfileUpdateRow({
  item, onSelectName,
}: {
  item: Extract<FeedItemData, { kind: 'profile-update' }>;
  onSelectName?: (name: string) => void;
}) {
  const c = useColors();
  const name = item.resource.name;
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(null);
    if (item.type === 'bio') fetchBio(name).then(setText);
    else if (item.type === 'status') fetchStatus(name).then(setText);
  }, [item.type, name]);

  const sentence = item.type === 'bio' ? 'updated their bio'
    : item.type === 'status' ? (text ? `changed their status to "${text}"` : 'changed their status')
    : item.type === 'avatar' ? 'updated their profile photo'
    : 'updated their friends list';

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, py: 1.25 }}>
      <AvatarDisplay name={name} size={32} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          onClick={() => onSelectName?.(name)}
          sx={{ fontSize: '0.8rem', color: c.textPrimary, cursor: onSelectName ? 'pointer' : 'default', '&:hover': onSelectName ? { color: c.accent } : undefined }}
        >
          <Box component="span" sx={{ fontWeight: tokens.typography.weightBold }}>{name}</Box>{' '}{sentence}
        </Typography>
        {item.type === 'bio' && text && (
          <Typography sx={{ fontSize: '0.75rem', color: c.textSecondary, mt: 0.25 }}>{text}</Typography>
        )}
        <Typography sx={{ fontSize: '0.65rem', color: c.textSecondary, opacity: 0.6, mt: 0.25 }}>
          {formatTimestamp(item.timestamp)}
        </Typography>
      </Box>
    </Box>
  );
}

function ContentCard({
  item, onSelectName,
}: {
  item: Extract<FeedItemData, { kind: 'content' }>;
  onSelectName?: (name: string) => void;
}) {
  const c = useColors();
  const { resource, group } = item;
  const name = resource.name;
  const title = resource.title || resource.identifier;
  const [opening, setOpening] = useState(false);

  async function handleOpen() {
    if (opening) return;
    setOpening(true);
    try {
      if (group === 'media') {
        await openMediaPlayer(resource.service, resource.name, resource.identifier);
      } else {
        const url = await getQdnResourceUrl(resource.service, resource.name, resource.identifier);
        await qdnRequest({ action: 'OPEN_NEW_TAB', address: url });
      }
    } finally {
      setOpening(false);
    }
  }

  return (
    <Box sx={{
      border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
      borderRadius: `${tokens.shape.radius}px`,
      bgcolor: c.surface,
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AvatarDisplay name={name} size={28} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            onClick={() => onSelectName?.(name)}
            sx={{ fontSize: '0.78rem', fontWeight: tokens.typography.weightBold, color: c.textPrimary, cursor: onSelectName ? 'pointer' : 'default' }}
          >
            {name}
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: c.textSecondary, opacity: 0.6 }}>
            {formatTimestamp(item.timestamp)}
          </Typography>
        </Box>
      </Box>

      {group === 'image' && (
        <Box
          component="img"
          src={`/arbitrary/${resource.service}/${resource.name}/${resource.identifier}`}
          alt={title}
          sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: `${tokens.shape.radiusSm}px` }}
        />
      )}

      <Typography sx={{ fontSize: '0.85rem', fontWeight: tokens.typography.weightMedium, color: c.textPrimary }}>
        {title}
      </Typography>
      {resource.description && (
        <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary }}>{resource.description}</Typography>
      )}

      <Box>
        <IconButton size="small" onClick={handleOpen} disabled={opening} sx={{ color: c.accent, p: 0.5 }}>
          {group === 'media' ? <PlayCircleOutlineIcon fontSize="small" /> : <OpenInNewIcon fontSize="small" />}
        </IconButton>
      </Box>
    </Box>
  );
}
