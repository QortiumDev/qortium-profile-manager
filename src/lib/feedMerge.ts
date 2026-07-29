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
