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

export const ALL_CONTENT_GROUPS: ContentGroup[] = ['image', 'media', 'post', 'other'];

export interface FeedFilters {
  showProfileUpdates: boolean;
  friend: string | null;
  contentGroups: Set<ContentGroup>;
}

export function defaultFeedFilters(): FeedFilters {
  return { showProfileUpdates: true, friend: null, contentGroups: new Set(ALL_CONTENT_GROUPS) };
}

export function isDefaultFeedFilters(filters: FeedFilters): boolean {
  return filters.showProfileUpdates === true
    && filters.friend === null
    && filters.contentGroups.size === ALL_CONTENT_GROUPS.length;
}

export function applyFeedFilters(items: FeedItem[], filters: FeedFilters): FeedItem[] {
  return items.filter(item => {
    if (filters.friend && item.resource.name !== filters.friend) return false;
    if (item.kind === 'profile-update') return filters.showProfileUpdates;
    return filters.contentGroups.has(item.group);
  });
}
