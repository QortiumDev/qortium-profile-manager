import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchResourcesPage } from '../api/rest';
import {
  classifyFeedItem, applyFeedFilters, defaultFeedFilters,
  type FeedFilters, type FeedItem,
} from '../lib/feedItem';
import {
  createFeedStreams, drainReadyItems, refillStream, isFeedExhausted,
  FEED_PAGE_SIZE, type FeedStreamState,
} from '../lib/feedMerge';

const RENDER_BATCH = 20;

export function useFeed(names: string[]) {
  const namesKey = names.join(',');
  const [streams, setStreams] = useState<FeedStreamState[]>(() => createFeedStreams(names));
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FeedFilters>(defaultFeedFilters);

  useEffect(() => {
    setStreams(createFeedStreams(names));
    setItems([]);
    // Re-init whenever the *set* of names changes, not on every re-render of the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey]);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      let current = streams;
      for (;;) {
        const drained = drainReadyItems(current, RENDER_BATCH);
        if (drained.blockedOn.length === 0) {
          current = drained.streams;
          if (drained.items.length > 0) setItems(prev => [...prev, ...drained.items]);
          setStreams(current);
          return;
        }
        const refills = await Promise.all(
          drained.blockedOn.map(async name => {
            const stream = current.find(s => s.name === name)!;
            const page = await fetchResourcesPage(name, FEED_PAGE_SIZE, stream.offset);
            return { name, page: page.map(classifyFeedItem) };
          }),
        );
        for (const { name, page } of refills) {
          current = refillStream(current, name, page);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [streams]);

  const hasMore = useMemo(() => !isFeedExhausted(streams), [streams]);
  const visibleItems = useMemo(() => applyFeedFilters(items, filters), [items, filters]);

  return {
    items: visibleItems,
    rawItemCount: items.length,
    filters,
    setFilters,
    loadMore,
    loading,
    hasMore,
  };
}
