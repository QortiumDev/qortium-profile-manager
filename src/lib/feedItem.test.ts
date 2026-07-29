import { describe, it, expect } from 'vitest';
import { classifyFeedItem, contentGroup, resourceTimestamp, applyFeedFilters, defaultFeedFilters, isDefaultFeedFilters, ALL_CONTENT_GROUPS } from './feedItem';
import type { FeedItem } from './feedItem';
import type { QdnFeedResource } from '../types';

function resource(overrides: Partial<QdnFeedResource>): QdnFeedResource {
  return { service: 'DOCUMENT', name: 'alice', identifier: 'post-1', ...overrides };
}

describe('resourceTimestamp', () => {
  it('prefers updated over created', () => {
    expect(resourceTimestamp(resource({ created: 100, updated: 200 }))).toBe(200);
  });
  it('falls back to created when updated is absent', () => {
    expect(resourceTimestamp(resource({ created: 100 }))).toBe(100);
  });
  it('falls back to 0 when neither is present', () => {
    expect(resourceTimestamp(resource({}))).toBe(0);
  });
});

describe('contentGroup', () => {
  it('groups IMAGE and GIF_REPOSITORY as image', () => {
    expect(contentGroup('IMAGE')).toBe('image');
    expect(contentGroup('GIF_REPOSITORY')).toBe('image');
  });
  it('groups THUMBNAIL as image', () => {
    expect(contentGroup('THUMBNAIL')).toBe('image');
  });
  it('groups AUDIO, VIDEO, VOICE, PODCAST as media', () => {
    expect(contentGroup('AUDIO')).toBe('media');
    expect(contentGroup('VIDEO')).toBe('media');
    expect(contentGroup('VOICE')).toBe('media');
    expect(contentGroup('PODCAST')).toBe('media');
  });
  it('groups DOCUMENT and BLOG_POST as post', () => {
    expect(contentGroup('DOCUMENT')).toBe('post');
    expect(contentGroup('BLOG_POST')).toBe('post');
  });
  it('groups everything else as other', () => {
    expect(contentGroup('APP')).toBe('other');
    expect(contentGroup('WEBSITE')).toBe('other');
    expect(contentGroup('ATTACHMENT')).toBe('other');
    expect(contentGroup('ARBITRARY_DATA')).toBe('other');
    expect(contentGroup('JSON')).toBe('other');
    expect(contentGroup('METADATA')).toBe('other');
    expect(contentGroup('PLAYLIST')).toBe('other');
  });
});

describe('classifyFeedItem', () => {
  it('classifies a DOCUMENT/bio resource as a profile-update of type bio', () => {
    const r = resource({ service: 'DOCUMENT', identifier: 'bio', updated: 500 });
    expect(classifyFeedItem(r)).toEqual({ kind: 'profile-update', type: 'bio', resource: r, timestamp: 500 });
  });
  it('classifies a DOCUMENT/status resource as a profile-update of type status', () => {
    const r = resource({ service: 'DOCUMENT', identifier: 'status', updated: 500 });
    expect(classifyFeedItem(r)).toEqual({ kind: 'profile-update', type: 'status', resource: r, timestamp: 500 });
  });
  it('classifies a DOCUMENT/friends resource as a profile-update of type friends', () => {
    const r = resource({ service: 'DOCUMENT', identifier: 'friends', updated: 500 });
    expect(classifyFeedItem(r)).toEqual({ kind: 'profile-update', type: 'friends', resource: r, timestamp: 500 });
  });
  it('classifies a THUMBNAIL/avatar resource as a profile-update of type avatar', () => {
    const r = resource({ service: 'THUMBNAIL', identifier: 'avatar', updated: 500 });
    expect(classifyFeedItem(r)).toEqual({ kind: 'profile-update', type: 'avatar', resource: r, timestamp: 500 });
  });
  it('classifies a THUMBNAIL resource with a different identifier as content (image group), not a profile update', () => {
    const r = resource({ service: 'THUMBNAIL', identifier: 'cover-art', updated: 500 });
    expect(classifyFeedItem(r)).toEqual({ kind: 'content', group: 'image', resource: r, timestamp: 500 });
  });
  it('classifies a DOCUMENT resource with an unrelated identifier as content (post group)', () => {
    const r = resource({ service: 'DOCUMENT', identifier: 'my-essay', updated: 500 });
    expect(classifyFeedItem(r)).toEqual({ kind: 'content', group: 'post', resource: r, timestamp: 500 });
  });
  it('classifies an IMAGE resource as content (image group)', () => {
    const r = resource({ service: 'IMAGE', identifier: 'vacation-photo', created: 300 });
    expect(classifyFeedItem(r)).toEqual({ kind: 'content', group: 'image', resource: r, timestamp: 300 });
  });
  it('classifies a PLAYLIST resource as content (other group)', () => {
    const r = resource({ service: 'PLAYLIST', identifier: 'my-mix', created: 300 });
    expect(classifyFeedItem(r)).toEqual({ kind: 'content', group: 'other', resource: r, timestamp: 300 });
  });
});

function profileUpdate(name: string, type: 'bio' | 'status' | 'avatar' | 'friends', timestamp: number): FeedItem {
  return { kind: 'profile-update', type, timestamp, resource: resource({ name, identifier: type, updated: timestamp }) };
}

function content(name: string, group: 'image' | 'media' | 'post' | 'other', timestamp: number): FeedItem {
  return { kind: 'content', group, timestamp, resource: resource({ name, identifier: 'x', updated: timestamp }) };
}

describe('defaultFeedFilters / isDefaultFeedFilters', () => {
  it('the default filters show everything', () => {
    const f = defaultFeedFilters();
    expect(f.showProfileUpdates).toBe(true);
    expect(f.friend).toBeNull();
    expect(f.contentGroups.size).toBe(ALL_CONTENT_GROUPS.length);
  });
  it('isDefaultFeedFilters is true for the default filters', () => {
    expect(isDefaultFeedFilters(defaultFeedFilters())).toBe(true);
  });
  it('isDefaultFeedFilters is false once any filter is narrowed', () => {
    expect(isDefaultFeedFilters({ ...defaultFeedFilters(), friend: 'alice' })).toBe(false);
    expect(isDefaultFeedFilters({ ...defaultFeedFilters(), showProfileUpdates: false })).toBe(false);
    expect(isDefaultFeedFilters({ ...defaultFeedFilters(), contentGroups: new Set(['image']) })).toBe(false);
  });
});

describe('applyFeedFilters', () => {
  const items = [
    profileUpdate('alice', 'status', 500),
    content('alice', 'image', 400),
    content('bob', 'media', 300),
  ];

  it('returns everything under default filters', () => {
    expect(applyFeedFilters(items, defaultFeedFilters())).toEqual(items);
  });

  it('hides profile-update items when showProfileUpdates is false', () => {
    const result = applyFeedFilters(items, { ...defaultFeedFilters(), showProfileUpdates: false });
    expect(result).toEqual([items[1], items[2]]);
  });

  it('narrows to one friend, keeping both their profile-update and content items', () => {
    const result = applyFeedFilters(items, { ...defaultFeedFilters(), friend: 'alice' });
    expect(result).toEqual([items[0], items[1]]);
  });

  it('narrows by content group, leaving profile-update items untouched by the group filter', () => {
    const result = applyFeedFilters(items, { ...defaultFeedFilters(), contentGroups: new Set(['media']) });
    expect(result).toEqual([items[0], items[2]]);
  });

  it('combines all three filters with AND', () => {
    const result = applyFeedFilters(items, {
      showProfileUpdates: false, friend: 'alice', contentGroups: new Set(['image']),
    });
    expect(result).toEqual([items[1]]);
  });
});
