// Lightweight readers for JSON payloads published by other Q-Apps (Help, Discussion Boards)
// that show up as raw QDN resources in the feed. Mirrors the validation each app applies to
// its own payloads before trusting them - the feed can't assume chain data is well-formed.

export type HelpFeedbackType = 'idea' | 'issue';
export type HelpFeedbackStatus = 'done' | 'open';

export interface HelpFeedbackPost {
  kind: 'post';
  app: string | null;
  title: string;
  body: string;
  type: HelpFeedbackType;
  status: HelpFeedbackStatus;
}

export interface HelpFeedbackComment {
  kind: 'comment';
  body: string;
  postId: string;
}

export type BoardReactionValue = 'like' | 'insightful' | 'agree' | 'laugh' | 'support';

export interface BoardTopic {
  kind: 'topic';
  title: string;
  description: string;
}

export interface BoardThread {
  kind: 'thread';
  title: string;
  body: string;
  hasPoll: boolean;
}

export interface BoardPost {
  kind: 'post';
  body: string;
}

export interface BoardReaction {
  kind: 'reaction';
  reaction: BoardReactionValue | null;
  targetKind: 'post' | 'thread';
}

export const REACTION_EMOJI: Record<BoardReactionValue, string> = {
  like: '\u{1F44D}',
  insightful: '\u{1F4A1}',
  agree: '✅',
  laugh: '\u{1F602}',
  support: '\u{1F91D}',
};

const REACTION_VALUES = new Set<BoardReactionValue>(['like', 'insightful', 'agree', 'laugh', 'support']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeHelpPost(value: unknown): HelpFeedbackPost | null {
  if (!isRecord(value) || value.kind !== 'post') return null;
  const title = str(value.title);
  const body = str(value.body);
  if (!title || !body) return null;
  return {
    kind: 'post',
    app: str(value.app) || null,
    title,
    body,
    type: value.type === 'issue' ? 'issue' : 'idea',
    status: value.status === 'done' ? 'done' : 'open',
  };
}

export function normalizeHelpComment(value: unknown): HelpFeedbackComment | null {
  if (!isRecord(value) || value.kind !== 'comment') return null;
  const body = str(value.body);
  const postId = str(value.postId);
  if (!body || !postId) return null;
  return { kind: 'comment', body, postId };
}

export function normalizeBoardTopic(value: unknown): BoardTopic | null {
  if (!isRecord(value) || value.kind !== 'topic') return null;
  const title = str(value.title);
  if (!title) return null;
  return { kind: 'topic', title, description: str(value.description) };
}

export function normalizeBoardThread(value: unknown): BoardThread | null {
  if (!isRecord(value) || value.kind !== 'thread') return null;
  const title = str(value.title);
  const body = str(value.body);
  if (!title || !body) return null;
  const poll = isRecord(value.poll) ? value.poll : null;
  return { kind: 'thread', title, body, hasPoll: !!poll && !!str(poll.pollName) };
}

export function normalizeBoardPost(value: unknown): BoardPost | null {
  if (!isRecord(value) || value.kind !== 'post') return null;
  const body = str(value.body);
  if (!body) return null;
  return { kind: 'post', body };
}

export function normalizeBoardReaction(value: unknown): BoardReaction | null {
  if (!isRecord(value) || value.kind !== 'reaction') return null;
  const targetKind = value.targetKind === 'post' || value.targetKind === 'thread' ? value.targetKind : null;
  if (!targetKind) return null;
  const rawReaction = value.reaction;
  const reaction = typeof rawReaction === 'string' && REACTION_VALUES.has(rawReaction as BoardReactionValue)
    ? (rawReaction as BoardReactionValue)
    : null;
  return { kind: 'reaction', reaction, targetKind };
}
