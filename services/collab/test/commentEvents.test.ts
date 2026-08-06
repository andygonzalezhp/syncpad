import { describe, expect, it } from "vitest";
import {
  canBroadcastCommentEvent,
  COMMENT_SYNC_EVENT_TYPES,
  parseCommentSyncEvent,
} from "../src/commentEvents.js";

const threadId = "40000000-0000-4000-8000-000000000001";

describe("parseCommentSyncEvent", () => {
  it.each(COMMENT_SYNC_EVENT_TYPES)("accepts the allowed %s event", (type) => {
    expect(parseCommentSyncEvent(JSON.stringify({ type, threadId }))).toEqual({
      type,
      threadId,
    });
  });

  it.each([
    ["empty payload", ""],
    ["invalid JSON", "{"],
    ["non-object JSON", "[]"],
    ["missing thread", JSON.stringify({ type: "COMMENT_CREATED" })],
    [
      "invalid thread identifier",
      JSON.stringify({ type: "COMMENT_CREATED", threadId: "not-a-uuid" }),
    ],
    [
      "unknown or legacy event type",
      JSON.stringify({ type: "COMMENT_UPDATED", threadId }),
    ],
    [
      "oversized payload",
      JSON.stringify({
        type: "COMMENT_CREATED",
        threadId,
        staleData: "x".repeat(600),
      }),
    ],
  ])("rejects %s", (_description, payload) => {
    expect(parseCommentSyncEvent(payload)).toBeNull();
  });

  it("returns only the canonical lightweight event fields", () => {
    expect(
      parseCommentSyncEvent(
        JSON.stringify({
          type: "COMMENT_REPLY_CREATED",
          threadId,
          staleThreadSnapshot: { status: "OPEN", messages: [] },
        }),
      ),
    ).toEqual({ type: "COMMENT_REPLY_CREATED", threadId });
  });
});

describe("canBroadcastCommentEvent", () => {
  it.each(["OWNER", "EDITOR"])("allows the %s role", (role) => {
    expect(canBroadcastCommentEvent(role)).toBe(true);
  });

  it.each(["VIEWER", undefined, null, "ADMIN"])(
    "rejects a non-mutating or invalid %s role",
    (role) => {
      expect(canBroadcastCommentEvent(role)).toBe(false);
    },
  );
});
