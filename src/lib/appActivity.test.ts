import { describe, it, expect } from 'vitest';
import {
  normalizeHelpPost, normalizeHelpComment,
  normalizeBoardTopic, normalizeBoardThread, normalizeBoardPost, normalizeBoardReaction,
} from './appActivity';

describe('normalizeHelpPost', () => {
  it('parses a well-formed help feedback post', () => {
    expect(normalizeHelpPost({
      app: 'Library',
      body: 'Would it be an idea to delete images automatically?',
      kind: 'post',
      status: 'open',
      title: 'Purging publishes',
      type: 'idea',
    })).toEqual({
      kind: 'post',
      app: 'Library',
      title: 'Purging publishes',
      body: 'Would it be an idea to delete images automatically?',
      type: 'idea',
      status: 'open',
    });
  });
  it('defaults type to idea and status to open when missing or invalid', () => {
    const result = normalizeHelpPost({ body: 'b', kind: 'post', title: 't' });
    expect(result?.type).toBe('idea');
    expect(result?.status).toBe('open');
  });
  it('treats a blank/absent app as null', () => {
    expect(normalizeHelpPost({ body: 'b', kind: 'post', title: 't' })?.app).toBeNull();
    expect(normalizeHelpPost({ app: '  ', body: 'b', kind: 'post', title: 't' })?.app).toBeNull();
  });
  it('returns null when kind is not post', () => {
    expect(normalizeHelpPost({ body: 'b', kind: 'comment', title: 't' })).toBeNull();
  });
  it('returns null when title or body is missing', () => {
    expect(normalizeHelpPost({ kind: 'post', title: 't' })).toBeNull();
    expect(normalizeHelpPost({ body: 'b', kind: 'post' })).toBeNull();
  });
  it('returns null for non-object input', () => {
    expect(normalizeHelpPost(null)).toBeNull();
    expect(normalizeHelpPost('post')).toBeNull();
    expect(normalizeHelpPost([1, 2])).toBeNull();
  });
});

describe('normalizeHelpComment', () => {
  it('parses a well-formed comment', () => {
    expect(normalizeHelpComment({ body: 'me too', kind: 'comment', postId: 'ms9dzpgy3i6h5k4v1g' }))
      .toEqual({ kind: 'comment', body: 'me too', postId: 'ms9dzpgy3i6h5k4v1g' });
  });
  it('returns null when postId is missing', () => {
    expect(normalizeHelpComment({ body: 'me too', kind: 'comment' })).toBeNull();
  });
  it('returns null when kind is not comment', () => {
    expect(normalizeHelpComment({ body: 'me too', kind: 'post', postId: 'x' })).toBeNull();
  });
});

describe('normalizeBoardTopic', () => {
  it('parses a well-formed topic', () => {
    expect(normalizeBoardTopic({ description: 'General chat', kind: 'topic', title: 'General' }))
      .toEqual({ kind: 'topic', title: 'General', description: 'General chat' });
  });
  it('returns null when title is missing', () => {
    expect(normalizeBoardTopic({ description: 'General chat', kind: 'topic' })).toBeNull();
  });
});

describe('normalizeBoardThread', () => {
  it('parses a well-formed thread without a poll', () => {
    expect(normalizeBoardThread({ body: 'b', kind: 'thread', title: 't', topicId: 'x' }))
      .toEqual({ kind: 'thread', title: 't', body: 'b', hasPoll: false });
  });
  it('detects a poll with a pollName', () => {
    const result = normalizeBoardThread({ body: 'b', kind: 'thread', poll: { pollName: 'boards-x' }, title: 't', topicId: 'x' });
    expect(result?.hasPoll).toBe(true);
  });
  it('returns null when title or body is missing', () => {
    expect(normalizeBoardThread({ kind: 'thread', title: 't', topicId: 'x' })).toBeNull();
  });
});

describe('normalizeBoardPost', () => {
  it('parses a well-formed reply post', () => {
    expect(normalizeBoardPost({ body: 'reply text', kind: 'post', threadId: 'x' })).toEqual({ kind: 'post', body: 'reply text' });
  });
  it('returns null when body is missing', () => {
    expect(normalizeBoardPost({ kind: 'post', threadId: 'x' })).toBeNull();
  });
});

describe('normalizeBoardReaction', () => {
  it('parses a well-formed reaction', () => {
    expect(normalizeBoardReaction({
      kind: 'reaction', reaction: 'like', targetId: 'mscsjxaw2z4t31354u0o', targetKind: 'post',
    })).toEqual({ kind: 'reaction', reaction: 'like', targetKind: 'post' });
  });
  it('accepts a null reaction (a removed reaction)', () => {
    expect(normalizeBoardReaction({ kind: 'reaction', reaction: null, targetId: 'x', targetKind: 'thread' }))
      .toEqual({ kind: 'reaction', reaction: null, targetKind: 'thread' });
  });
  it('treats an unrecognized reaction value as null rather than passing it through', () => {
    expect(normalizeBoardReaction({ kind: 'reaction', reaction: 'not-a-real-reaction', targetId: 'x', targetKind: 'post' }))
      .toEqual({ kind: 'reaction', reaction: null, targetKind: 'post' });
  });
  it('returns null when targetKind is invalid', () => {
    expect(normalizeBoardReaction({ kind: 'reaction', reaction: 'like', targetId: 'x', targetKind: 'topic' })).toBeNull();
  });
});
