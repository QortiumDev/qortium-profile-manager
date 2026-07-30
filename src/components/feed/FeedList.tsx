import { useEffect, useMemo, useRef } from 'react';
import {
  Box, Chip, CircularProgress, FormControlLabel, MenuItem, Select, Switch, Typography,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { FeedItemRow } from './FeedItem';
import { useFeed } from '../../hooks/useFeed';
import { ALL_CONTENT_GROUPS, isDefaultFeedFilters, type ContentGroup } from '../../lib/feedItem';

const GROUP_LABELS: Record<ContentGroup, string> = {
  image: 'Images',
  media: 'Audio/Video',
  post: 'Posts & Docs',
  other: 'Other',
};

interface Props {
  mode: 'home' | 'single';
  friendNames: string[];
  selfName: string | null;
}

export function FeedList({ mode, friendNames, selfName }: Props) {
  const c = useColors();
  const navigate = useNavigate();
  const names = useMemo(() => {
    if (mode === 'single') return selfName ? [selfName] : [];
    return selfName ? [...friendNames, selfName] : friendNames;
  }, [mode, friendNames, selfName]);

  const { items, filters, setFilters, loadMore, loading, hasMore } = useFeed(names);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const namesKey = names.join(',');

  useEffect(() => {
    void loadMore();
    // Only re-run when the underlying name set changes (loadMore's identity already
    // changes with it), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) void loadMore();
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (mode === 'home' && friendNames.length === 0) {
    return (
      <Box
        onClick={() => navigate('/friends')}
        sx={{ border: `${tokens.shape.borderWidth} solid ${c.borderLight}`, borderRadius: `${tokens.shape.radius}px`, p: 3, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { borderColor: c.accent } }}
      >
        <PeopleIcon sx={{ fontSize: '1.25rem', color: c.textSecondary, opacity: 0.4 }} />
        <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary }}>Add friends to see their activity here.</Typography>
      </Box>
    );
  }

  const noActivityAtAll = items.length === 0 && !loading && isDefaultFeedFilters(filters) && !hasMore;
  const noMatchForFilters = items.length === 0 && !loading && !isDefaultFeedFilters(filters);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={filters.showProfileUpdates}
              onChange={e => setFilters(f => ({ ...f, showProfileUpdates: e.target.checked }))}
            />
          }
          label={<Typography sx={{ fontSize: '0.78rem' }}>Profile updates</Typography>}
        />

        {mode === 'home' && (
          <Select
            size="small"
            value={filters.friend ?? '__all__'}
            onChange={e => setFilters(f => ({ ...f, friend: e.target.value === '__all__' ? null : e.target.value }))}
            sx={{ fontSize: '0.78rem', minWidth: 140 }}
          >
            <MenuItem value="__all__">All friends</MenuItem>
            {friendNames.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
          </Select>
        )}

        {ALL_CONTENT_GROUPS.map(group => (
          <Chip
            key={group}
            label={GROUP_LABELS[group]}
            size="small"
            color={filters.contentGroups.has(group) ? 'primary' : 'default'}
            onClick={() => setFilters(f => {
              const next = new Set(f.contentGroups);
              if (next.has(group)) next.delete(group); else next.add(group);
              return { ...f, contentGroups: next };
            })}
          />
        ))}
      </Box>

      {noActivityAtAll && (
        <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary, textAlign: 'center', py: 4 }}>
          No activity yet.
        </Typography>
      )}
      {noMatchForFilters && (
        <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary, textAlign: 'center', py: 4 }}>
          No items match these filters.
        </Typography>
      )}

      {items.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {items.map(item => (
            <FeedItemRow
              key={`${item.resource.name}:${item.resource.service}:${item.resource.identifier}:${item.timestamp}`}
              item={item}
              onSelectName={n => navigate(`/profile/${encodeURIComponent(n)}`)}
            />
          ))}
        </Box>
      )}

      <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        {loading ? (
          <CircularProgress size={20} sx={{ color: c.accent }} />
        ) : !hasMore && items.length > 0 ? (
          <Typography sx={{ fontSize: '0.75rem', color: c.textSecondary, opacity: 0.6 }}>
            You're all caught up
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
