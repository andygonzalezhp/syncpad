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
      className={`rounded-2xl p-4 transition duration-200 ${
        isActive
          ? "bg-white shadow-[0_10px_30px_rgba(20,20,18,0.08)] ring-2 ring-indigo-200"
          : thread.status === "RESOLVED"
            ? "bg-[#f4f4f1] ring-1 ring-black/[0.045] hover:bg-[#f1f1ee]"
            : "bg-white ring-1 ring-black/[0.06] hover:shadow-[0_8px_24px_rgba(20,20,18,0.055)]"
      }`}
      aria-busy={isBusy}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5]"
        aria-pressed={isActive}
      >
        <div className="flex items-start justify-between gap-3">
          <blockquote
            className={`min-w-0 break-words line-clamp-3 border-l-2 pl-3 text-[13px] leading-5 text-[#6f6f69] ${
              thread.status === "RESOLVED"
                ? "border-[#c4c4bd]"
                : "border-[#dbb84a]"
            }`}
          >
            {thread.selectedText}
          </blockquote>

          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`shrink-0 rounded-md px-2 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.1em] ${
              thread.status === "OPEN"
                ? "bg-[#fff4c7] text-[#745b0e]"
                : "bg-[#e9e9e5] text-[#6f6f69]"
            }`}
          >
            {thread.status === "OPEN" ? "Open" : "Resolved"}
          </span>
        </div>

        {!isAnchored && (
          <p className="mt-3 rounded-lg bg-[#fff7ed] px-3 py-2 text-xs text-[#9a4b08]">
            The referenced text is no longer present.
          </p>
        )}
      </button>

      <div
        className="relative mt-4 space-y-4 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-black/[0.07]"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {thread.messages.map((message, index) => (
          <div key={message.id} className={index === 0 ? "relative" : "relative pt-1"}>
            <div className="relative z-10 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#20201e] text-[11px] font-semibold text-white ring-2 ring-white">
                {authorInitial(message.author)}
              </span>

              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#20201e]">
                  {displayAuthor(message.author)}
                </p>
                <time
                  dateTime={message.createdAt}
                  className="block text-[11px] text-[#969690]"
                  title={formatTimestamp(message.createdAt)}
                >
                  {formatTimestamp(message.createdAt)}
                </time>
              </div>
            </div>

            <p className="relative z-10 ml-9 mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#454541]">
              {message.body}
            </p>
          </div>
        ))}
      </div>

      {thread.status === "RESOLVED" && thread.resolvedBy && thread.resolvedAt && (
        <p className="mt-4 rounded-lg bg-black/[0.025] px-3 py-2 text-xs leading-5 text-[#777771]">
          Resolved by {displayAuthor(thread.resolvedBy)} on{" "}
          {formatTimestamp(thread.resolvedAt)}.
        </p>
      )}

      {canComment && (
        <div className="mt-4 border-t border-black/[0.06] pt-4">
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
              className="min-h-20 w-full resize-y rounded-xl border border-black/[0.09] bg-[#fbfbf9] px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#4f46e5] focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-[#f1f1ee] disabled:opacity-70"
              placeholder="Reply..."
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={handleChangeStatus}
                className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-[#666660] transition duration-150 hover:bg-black/[0.04] hover:text-[#20201e] disabled:cursor-not-allowed disabled:opacity-50"
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
                className="min-h-10 rounded-lg bg-[#20201e] px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
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
