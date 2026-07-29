import { describe, it, expect } from 'vitest';
import { classifyFeedItem, contentGroup, resourceTimestamp } from './feedItem';
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
