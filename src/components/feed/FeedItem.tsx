import { useEffect, useState } from 'react';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { AvatarDisplay } from '../profile/AvatarDisplay';
import { fetchBio, fetchStatus, fetchJsonResource, openMediaPlayer } from '../../api/qortal';
import type { FeedItem as FeedItemData, AppActivityKind } from '../../lib/feedItem';
import {
  REACTION_EMOJI,
  normalizeHelpPost, normalizeHelpComment,
  normalizeBoardTopic, normalizeBoardThread, normalizeBoardPost, normalizeBoardReaction,
} from '../../lib/appActivity';

interface Props {
  item: FeedItemData;
  onSelectName?: (name: string) => void;
}

function formatTimestamp(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function FeedItemRow({ item, onSelectName }: Props) {
  if (item.kind === 'profile-update') return <ProfileUpdateRow item={item} onSelectName={onSelectName} />;
  if (item.kind === 'app-activity') return <AppActivityCard item={item} onSelectName={onSelectName} />;
  return <ContentCard item={item} onSelectName={onSelectName} />;
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

const ACTIVITY_SOURCE: Record<AppActivityKind, string> = {
  'help-post': 'Help',
  'help-comment': 'Help',
  'board-topic': 'Discussion Boards',
  'board-thread': 'Discussion Boards',
  'board-post': 'Discussion Boards',
  'board-reaction': 'Discussion Boards',
};

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed;
}

function FallbackLine({ text }: { text: string }) {
  const c = useColors();
  return <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary }}>{text}</Typography>;
}

function ActivityBody({ activity, payload }: { activity: AppActivityKind; payload: unknown }) {
  const c = useColors();

  if (payload === undefined) {
    return <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary, opacity: 0.6 }}>Loading…</Typography>;
  }

  if (activity === 'help-post') {
    const post = normalizeHelpPost(payload);
    if (!post) return <FallbackLine text="posted feedback" />;
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={post.type === 'issue' ? 'Issue' : 'Idea'}
            sx={{ height: 20, fontSize: '0.68rem', bgcolor: post.type === 'issue' ? c.dangerSoft : c.accentSoft, color: post.type === 'issue' ? c.danger : c.accent }}
          />
          <Chip
            size="small"
            label={post.status === 'done' ? 'Done' : 'Open'}
            sx={{ height: 20, fontSize: '0.68rem', bgcolor: post.status === 'done' ? c.accentSoft : c.controlBg, color: post.status === 'done' ? c.success : c.textSecondary }}
          />
          {post.app && <Chip size="small" variant="outlined" label={post.app} sx={{ height: 20, fontSize: '0.68rem' }} />}
        </Box>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: tokens.typography.weightMedium, color: c.textPrimary }}>
          {post.title}
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary }}>{truncate(post.body, 220)}</Typography>
      </>
    );
  }

  if (activity === 'help-comment') {
    const comment = normalizeHelpComment(payload);
    if (!comment) return <FallbackLine text="commented on feedback" />;
    return (
      <>
        <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary, fontStyle: 'italic' }}>commented on a feedback post</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary }}>{truncate(comment.body, 220)}</Typography>
      </>
    );
  }

  if (activity === 'board-topic') {
    const topic = normalizeBoardTopic(payload);
    if (!topic) return <FallbackLine text="created a topic on Discussion Boards" />;
    return (
      <>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: tokens.typography.weightMedium, color: c.textPrimary }}>{topic.title}</Typography>
        {topic.description && (
          <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary }}>{truncate(topic.description, 220)}</Typography>
        )}
      </>
    );
  }

  if (activity === 'board-thread') {
    const thread = normalizeBoardThread(payload);
    if (!thread) return <FallbackLine text="started a thread on Discussion Boards" />;
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: tokens.typography.weightMedium, color: c.textPrimary }}>{thread.title}</Typography>
          {thread.hasPoll && (
            <Chip size="small" label="Poll" sx={{ height: 20, fontSize: '0.68rem', bgcolor: c.accentSoft, color: c.accent }} />
          )}
        </Box>
        <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary }}>{truncate(thread.body, 220)}</Typography>
      </>
    );
  }

  if (activity === 'board-post') {
    const post = normalizeBoardPost(payload);
    if (!post) return <FallbackLine text="replied on Discussion Boards" />;
    return (
      <>
        <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary, fontStyle: 'italic' }}>replied in a discussion</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: c.textSecondary }}>{truncate(post.body, 220)}</Typography>
      </>
    );
  }

  const reaction = normalizeBoardReaction(payload);
  if (!reaction) return <FallbackLine text="reacted on Discussion Boards" />;
  const verb = reaction.reaction ? `reacted ${REACTION_EMOJI[reaction.reaction]}` : 'removed their reaction';
  return (
    <Typography sx={{ fontSize: '0.8rem', color: c.textPrimary }}>
      {verb} to a {reaction.targetKind} on Discussion Boards
    </Typography>
  );
}

function AppActivityCard({
  item, onSelectName,
}: {
  item: Extract<FeedItemData, { kind: 'app-activity' }>;
  onSelectName?: (name: string) => void;
}) {
  const c = useColors();
  const { resource, activity } = item;
  const name = resource.name;
  const [payload, setPayload] = useState<unknown>(undefined);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setPayload(undefined);
    fetchJsonResource(name, resource.identifier).then(setPayload);
  }, [name, resource.identifier]);

  async function handleOpen() {
    if (opening) return;
    setOpening(true);
    try {
      const address = `qdn://${resource.service}/${encodeURIComponent(name)}/${encodeURIComponent(resource.identifier)}`;
      await qdnRequest({ action: 'OPEN_NEW_TAB', address });
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
            {formatTimestamp(item.timestamp)} · {ACTIVITY_SOURCE[activity]}
          </Typography>
        </Box>
      </Box>

      <ActivityBody activity={activity} payload={payload} />

      <Box>
        <IconButton size="small" onClick={handleOpen} disabled={opening} sx={{ color: c.accent, p: 0.5 }}>
          <OpenInNewIcon fontSize="small" />
        </IconButton>
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
        // OPEN_NEW_TAB only accepts qdn://, home://, and core:// addresses - build one
        // directly rather than via GET_QDN_RESOURCE_URL, which returns an http:// render
        // URL meant for direct fetch/iframe embedding, not tab navigation.
        const address = `qdn://${resource.service}/${encodeURIComponent(resource.name)}/${encodeURIComponent(resource.identifier)}`;
        await qdnRequest({ action: 'OPEN_NEW_TAB', address });
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
