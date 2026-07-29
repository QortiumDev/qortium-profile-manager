import { describe, it, expect } from 'vitest';
import { createFeedStreams, streamsNeedingRefill, refillStream, FEED_PAGE_SIZE } from './feedMerge';
import type { FeedItem } from './feedItem';
import type { QdnFeedResource } from '../types';

function item(name: string, timestamp: number): FeedItem {
  const resource: QdnFeedResource = { service: 'DOCUMENT', name, identifier: 'x', updated: timestamp };
  return { kind: 'content', group: 'post', resource, timestamp };
}

describe('createFeedStreams', () => {
  it('creates one empty, non-exhausted stream per name at offset 0', () => {
    const streams = createFeedStreams(['alice', 'bob']);
    expect(streams).toEqual([
      { name: 'alice', buffer: [], offset: 0, exhausted: false },
      { name: 'bob', buffer: [], offset: 0, exhausted: false },
    ]);
  });

  it('returns an empty array for an empty name list', () => {
    expect(createFeedStreams([])).toEqual([]);
  });
});

describe('streamsNeedingRefill', () => {
  it('flags a stream with an empty buffer that is not exhausted', () => {
    const streams = createFeedStreams(['alice']);
    expect(streamsNeedingRefill(streams)).toEqual(['alice']);
  });

  it('does not flag a stream that already has buffered items', () => {
    const streams = refillStream(createFeedStreams(['alice']), 'alice', [item('alice', 100)]);
    expect(streamsNeedingRefill(streams)).toEqual([]);
  });

  it('does not flag an exhausted empty stream', () => {
    const streams = refillStream(createFeedStreams(['alice']), 'alice', []);
    expect(streamsNeedingRefill(streams)).toEqual([]);
  });

  it('only flags the streams that actually need it, across multiple streams', () => {
    let streams = createFeedStreams(['alice', 'bob', 'carol']);
    streams = refillStream(streams, 'bob', [item('bob', 100)]);
    expect(streamsNeedingRefill(streams)).toEqual(['alice', 'carol']);
  });
});

describe('refillStream', () => {
  it('sets the buffer, sorted by timestamp descending regardless of input order', () => {
    const streams = refillStream(createFeedStreams(['alice']), 'alice', [item('alice', 100), item('alice', 300), item('alice', 200)]);
    expect(streams[0].buffer.map(i => i.timestamp)).toEqual([300, 200, 100]);
  });

  it('advances offset by the number of items in the page', () => {
    const page = Array.from({ length: 5 }, (_, i) => item('alice', i));
    const streams = refillStream(createFeedStreams(['alice']), 'alice', page);
    expect(streams[0].offset).toBe(5);
  });

  it('does not mark the stream exhausted when the page is a full page', () => {
    const page = Array.from({ length: FEED_PAGE_SIZE }, (_, i) => item('alice', i));
    const streams = refillStream(createFeedStreams(['alice']), 'alice', page);
    expect(streams[0].exhausted).toBe(false);
  });

  it('marks the stream exhausted when the page is shorter than a full page', () => {
    const page = Array.from({ length: FEED_PAGE_SIZE - 1 }, (_, i) => item('alice', i));
    const streams = refillStream(createFeedStreams(['alice']), 'alice', page);
    expect(streams[0].exhausted).toBe(true);
  });

  it('marks the stream exhausted for an empty page (no more data at all)', () => {
    const streams = refillStream(createFeedStreams(['alice']), 'alice', []);
    expect(streams[0].exhausted).toBe(true);
    expect(streams[0].buffer).toEqual([]);
  });

  it('leaves other streams untouched', () => {
    const streams = refillStream(createFeedStreams(['alice', 'bob']), 'alice', [item('alice', 100)]);
    expect(streams[1]).toEqual({ name: 'bob', buffer: [], offset: 0, exhausted: false });
  });
});
