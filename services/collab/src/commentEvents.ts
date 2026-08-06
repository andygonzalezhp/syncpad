export const COMMENT_SYNC_EVENT_TYPES = [
  "COMMENT_CREATED",
  "COMMENT_REPLY_CREATED",
  "COMMENT_RESOLVED",
  "COMMENT_REOPENED",
] as const;

export type CommentSyncEvent = {
  type: (typeof COMMENT_SYNC_EVENT_TYPES)[number];
  threadId: string;
};

const commentSyncEventTypes = new Set<string>(COMMENT_SYNC_EVENT_TYPES);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

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
      !isUuid(value.threadId)
    ) {
      return null;
    }

    return {
      type: value.type as CommentSyncEvent["type"],
      threadId: value.threadId,
    };
  } catch {
    return null;
  }
}
