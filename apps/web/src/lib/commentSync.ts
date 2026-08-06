export const COMMENT_SYNC_EVENT_TYPES = [
  "COMMENT_CREATED",
  "COMMENT_REPLY_CREATED",
  "COMMENT_RESOLVED",
  "COMMENT_REOPENED",
] as const;

export type CommentSyncEventType = (typeof COMMENT_SYNC_EVENT_TYPES)[number];

export type CommentSyncEvent = {
  type: CommentSyncEventType;
  threadId: string;
};

const commentSyncEventTypes = new Set<string>(COMMENT_SYNC_EVENT_TYPES);

export function parseCommentSyncEvent(payload: string): CommentSyncEvent | null {
  if (!payload || payload.length > 512) {
    return null;
  }

  try {
    const value = JSON.parse(payload) as Record<string, unknown>;

    if (
      !value ||
      typeof value !== "object" ||
      typeof value.type !== "string" ||
      !commentSyncEventTypes.has(value.type) ||
      typeof value.threadId !== "string" ||
      !value.threadId
    ) {
      return null;
    }

    return {
      type: value.type as CommentSyncEventType,
      threadId: value.threadId,
    };
  } catch {
    return null;
  }
}

export function serializeCommentSyncEvent(event: CommentSyncEvent): string {
  return JSON.stringify(event);
}
