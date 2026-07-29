import type { QdnFeedResource } from '../types';

export type ProfileUpdateKind = 'bio' | 'status' | 'avatar' | 'friends';
export type ContentGroup = 'image' | 'media' | 'post' | 'other';

export type FeedItem =
  | { kind: 'profile-update'; type: ProfileUpdateKind; resource: QdnFeedResource; timestamp: number }
  | { kind: 'content'; group: ContentGroup; resource: QdnFeedResource; timestamp: number };

const PROFILE_UPDATE_IDENTIFIERS: Record<string, ProfileUpdateKind> = {
  bio: 'bio',
  status: 'status',
  avatar: 'avatar',
  friends: 'friends',
};

const PROFILE_UPDATE_SERVICES = new Set(['DOCUMENT', 'THUMBNAIL']);
const IMAGE_SERVICES = new Set(['IMAGE', 'GIF_REPOSITORY', 'THUMBNAIL']);
const MEDIA_SERVICES = new Set(['AUDIO', 'VIDEO', 'VOICE', 'PODCAST']);
const POST_SERVICES = new Set(['DOCUMENT', 'BLOG_POST']);

export function resourceTimestamp(resource: QdnFeedResource): number {
  return resource.updated ?? resource.created ?? 0;
}

export function contentGroup(service: string): ContentGroup {
  if (IMAGE_SERVICES.has(service)) return 'image';
  if (MEDIA_SERVICES.has(service)) return 'media';
  if (POST_SERVICES.has(service)) return 'post';
  return 'other';
}

export function classifyFeedItem(resource: QdnFeedResource): FeedItem {
  const timestamp = resourceTimestamp(resource);
  const profileKind = PROFILE_UPDATE_IDENTIFIERS[resource.identifier];
  if (profileKind && PROFILE_UPDATE_SERVICES.has(resource.service)) {
    return { kind: 'profile-update', type: profileKind, resource, timestamp };
  }
  return { kind: 'content', group: contentGroup(resource.service), resource, timestamp };
}
