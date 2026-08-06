"use client";

import { FormEvent, useState } from "react";
import type { CommentAuthor, CommentThread } from "@/lib/api";
import { commentDebug } from "@/lib/commentDebug";

type CommentThreadCardProps = {
  thread: CommentThread;
  isActive: boolean;
  isAnchored: boolean;
  canComment: boolean;
  isBusy: boolean;
  isReplying: boolean;
  isChangingStatus: boolean;
  onSelect: () => void;
  onReply: (message: string) => Promise<void>;
  onChangeStatus: (resolved: boolean) => Promise<void>;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function displayAuthor(author: CommentAuthor): string {
  return author.displayName?.trim() || author.email;
}

function authorInitial(author: CommentAuthor): string {
  return displayAuthor(author).charAt(0).toUpperCase() || "?";
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? "Unknown time"
    : dateFormatter.format(date);
}

export default function CommentThreadCard({
  thread,
  isActive,
  isAnchored,
  canComment,
  isBusy,
  isReplying,
  isChangingStatus,
  onSelect,
  onReply,
  onChangeStatus,
}: CommentThreadCardProps) {
  const [reply, setReply] = useState("");

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedReply = reply.trim();

    commentDebug("reply form submitted", {
      threadId: thread.id,
      messageLength: trimmedReply.length,
      isReplying,
    });

    if (!trimmedReply || isBusy) {
      commentDebug("reply submission ignored", {
        threadId: thread.id,
        reason: !trimmedReply ? "empty message" : "thread request already pending",
      });
      return;
    }

    try {
      await onReply(trimmedReply);
      setReply("");
    } catch {
      // The sidebar keeps the draft and presents the shared mutation error.
    }
  }

  async function handleChangeStatus() {
    if (isBusy) {
      return;
    }

    const resolved = thread.status !== "RESOLVED";

    commentDebug("status button clicked", {
      threadId: thread.id,
      currentStatus: thread.status,
      requestedStatus: resolved ? "RESOLVED" : "OPEN",
    });

    onSelect();

    try {
      await onChangeStatus(resolved);

      if (resolved) {
        window.requestAnimationFrame(() => {
          if (document.activeElement === document.body) {
            document
              .getElementById("show-resolved-comments")
              ?.focus();
          }
        });
      }
    } catch {
      // The sidebar presents the shared mutation error.
    }
  }

  return (
    <article
      className={`rounded-[1.4rem] border p-4 shadow-sm transition ${
        isActive
          ? "border-[#0b5cad] bg-white ring-2 ring-[#b7d7f0]"
          : thread.status === "RESOLVED"
            ? "border-[#dedbd3] bg-[#f5f4f1] hover:border-[#b8b5ad]"
            : "border-[#dedbd3] bg-white hover:border-[#b8b5ad]"
      }`}
      aria-busy={isBusy}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5cad]"
        aria-pressed={isActive}
      >
        <div className="flex items-start justify-between gap-3">
          <blockquote
            className={`min-w-0 break-words line-clamp-3 border-l-2 pl-3 text-sm leading-6 text-[#4f555c] ${
              thread.status === "RESOLVED"
                ? "border-[#aaa59d]"
                : "border-[#f0c24b]"
            }`}
          >
            {thread.selectedText}
          </blockquote>

          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${
              thread.status === "OPEN"
                ? "bg-[#fff3c4] text-[#765a00]"
                : "bg-[#eceae5] text-[#66615a]"
            }`}
          >
            {thread.status === "OPEN" ? "Open" : "Resolved"}
          </span>
        </div>

        {!isAnchored && (
          <p className="mt-3 rounded-xl bg-[#fff7ed] px-3 py-2 text-xs text-[#9a4b08]">
            The referenced text is no longer present.
          </p>
        )}
      </button>

      <div
        className="mt-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {thread.messages.map((message, index) => (
          <div key={message.id} className={index === 0 ? "" : "border-t border-[#eceae5] pt-4"}>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-xs font-semibold text-white">
                {authorInitial(message.author)}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1d1d1f]">
                  {displayAuthor(message.author)}
                </p>
                <time
                  dateTime={message.createdAt}
                  className="block text-xs text-[#86868b]"
                  title={formatTimestamp(message.createdAt)}
                >
                  {formatTimestamp(message.createdAt)}
                </time>
              </div>
            </div>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#343438]">
              {message.body}
            </p>
          </div>
        ))}
      </div>

      {thread.status === "RESOLVED" && thread.resolvedBy && thread.resolvedAt && (
        <p className="mt-4 text-xs leading-5 text-[#6e6e73]">
          Resolved by {displayAuthor(thread.resolvedBy)} on{" "}
          {formatTimestamp(thread.resolvedAt)}.
        </p>
      )}

      {canComment && (
        <div className="mt-4 border-t border-[#eceae5] pt-4">
          <form onSubmit={handleReply} className="space-y-2">
            <label className="sr-only" htmlFor={`reply-${thread.id}`}>
              Reply to comment
            </label>
            <textarea
              id={`reply-${thread.id}`}
              value={reply}
              maxLength={10_000}
              disabled={isBusy}
              onChange={(event) => setReply(event.target.value)}
              className="min-h-20 w-full resize-y rounded-2xl border border-[#dedbd3] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0b5cad] disabled:cursor-not-allowed disabled:bg-[#f5f4f1] disabled:opacity-70"
              placeholder="Reply..."
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={handleChangeStatus}
                className="min-h-11 rounded-full px-3 py-2 text-sm font-medium text-[#4f555c] transition hover:bg-[#f5f4f1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isChangingStatus
                  ? "Updating..."
                  : thread.status === "OPEN"
                    ? "Resolve"
                    : "Reopen"}
              </button>

              <button
                type="submit"
                disabled={!reply.trim() || isBusy}
                className="min-h-11 rounded-full bg-[#1d1d1f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReplying ? "Replying..." : "Reply"}
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
