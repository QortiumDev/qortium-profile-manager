import type { FeedItem } from './feedItem';

export const FEED_PAGE_SIZE = 20;

export interface FeedStreamState {
  name: string;
  buffer: FeedItem[];
  offset: number;
  exhausted: boolean;
}

export function createFeedStreams(names: string[]): FeedStreamState[] {
  return names.map(name => ({ name, buffer: [], offset: 0, exhausted: false }));
}

export function streamsNeedingRefill(streams: FeedStreamState[]): string[] {
  return streams.filter(s => s.buffer.length === 0 && !s.exhausted).map(s => s.name);
}

export function refillStream(streams: FeedStreamState[], name: string, page: FeedItem[]): FeedStreamState[] {
  return streams.map(s => {
    if (s.name !== name) return s;
    const sorted = [...page].sort((a, b) => b.timestamp - a.timestamp);
    return {
      ...s,
      buffer: sorted,
      offset: s.offset + page.length,
      exhausted: page.length < FEED_PAGE_SIZE,
    };
  });
}

export function popNextItem(streams: FeedStreamState[]): { item: FeedItem | null; streams: FeedStreamState[] } {
  let bestIndex = -1;
  for (let i = 0; i < streams.length; i++) {
    if (streams[i].buffer.length === 0) continue;
    if (bestIndex === -1 || streams[i].buffer[0].timestamp > streams[bestIndex].buffer[0].timestamp) {
      bestIndex = i;
    }
  }
  if (bestIndex === -1) return { item: null, streams };
  const item = streams[bestIndex].buffer[0];
  const nextStreams = streams.map((s, i) => (i === bestIndex ? { ...s, buffer: s.buffer.slice(1) } : s));
  return { item, streams: nextStreams };
}

export function drainReadyItems(
  streams: FeedStreamState[],
  count: number,
): { items: FeedItem[]; streams: FeedStreamState[]; blockedOn: string[] } {
  let current = streams;
  const items: FeedItem[] = [];
  for (;;) {
    if (items.length >= count) return { items, streams: current, blockedOn: [] };
    const blockedOn = streamsNeedingRefill(current);
    if (blockedOn.length > 0) return { items, streams: current, blockedOn };
    const { item, streams: next } = popNextItem(current);
    current = next;
    if (!item) return { items, streams: current, blockedOn: [] };
    items.push(item);
  }
}

export function isFeedExhausted(streams: FeedStreamState[]): boolean {
  return streams.every(s => s.exhausted && s.buffer.length === 0);
}
