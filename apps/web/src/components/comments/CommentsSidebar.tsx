"use client";

import { useEffect, useId, useRef } from "react";
import type { CommentThread } from "@/lib/api";
import type { CommentMutation } from "@/hooks/useDocumentComments";
import CommentThreadCard from "./CommentThreadCard";
import CreateCommentComposer from "./CreateCommentComposer";

type PendingComment = {
  selectedText: string;
};

type CommentsSidebarProps = {
  threads: CommentThread[];
  activeThreadId: string | null;
  anchoredThreadIds: Set<string>;
  pendingComment: PendingComment | null;
  canComment: boolean;
  isLoading: boolean;
  loadError: string | null;
  mutationError: string | null;
  mutation: CommentMutation[];
  showResolvedComments: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onCancelCreate: () => void;
  onCreate: (message: string) => Promise<void>;
  onSelectThread: (threadId: string) => void;
  onReply: (threadId: string, message: string) => Promise<void>;
  onChangeStatus: (threadId: string, resolved: boolean) => Promise<void>;
  onShowResolvedComments: (show: boolean) => void;
};

export default function CommentsSidebar({
  threads,
  activeThreadId,
  anchoredThreadIds,
  pendingComment,
  canComment,
  isLoading,
  loadError,
  mutationError,
  mutation,
  showResolvedComments,
  onClose,
  onRefresh,
  onCancelCreate,
  onCreate,
  onSelectThread,
  onReply,
  onChangeStatus,
  onShowResolvedComments,
}: CommentsSidebarProps) {
  const threadElements = useRef(new Map<string, HTMLDivElement>());
  const closeButton = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const openCount = threads.filter((thread) => thread.status === "OPEN").length;
  const resolvedCount = threads.length - openCount;
  const visibleThreads = showResolvedComments
    ? threads
    : threads.filter((thread) => thread.status === "OPEN");

  useEffect(() => {
    if (pendingComment) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      closeButton.current?.focus();
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [pendingComment]);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    threadElements.current.get(activeThreadId)?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [activeThreadId, showResolvedComments]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      onClose();
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(
            'button[title="Show document comments"]',
          )
          ?.focus();
      });
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleClose() {
    onClose();
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(
          'button[title="Show document comments"]',
        )
        ?.focus();
    });
  }

  return (
    <aside
      className="fixed inset-x-2 bottom-2 z-50 sm:inset-x-4 sm:bottom-4 xl:static xl:z-auto xl:block xl:w-[360px] xl:shrink-0"
      aria-labelledby={headingId}
    >
      <div
        className="max-h-[85dvh] w-full overscroll-contain overflow-y-auto rounded-[1.7rem] border border-[#dedbd3] bg-[#fbfaf7] p-3 shadow-2xl xl:sticky xl:top-[188px] xl:max-h-[calc(100vh-212px)] xl:shadow-sm"
        aria-busy={isLoading || mutation.length > 0}
      >
        <div className="flex items-start justify-between gap-3 px-2 py-2">
          <div>
            <h2
              id={headingId}
              className="text-lg font-semibold tracking-[-0.03em] text-[#1d1d1f]"
            >
              Comments
            </h2>
            <p className="mt-1 text-sm text-[#6e6e73]">
              Updates appear live for everyone in this document.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              ref={closeButton}
              type="button"
              onClick={handleClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-[#4f555c] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5cad]"
              aria-label="Close comments"
              title="Close comments"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mx-1 mt-2 rounded-2xl border border-[#dedbd3] bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#6e6e73]">
            <span
              className="rounded-full bg-[#fff3c4] px-2.5 py-1 text-[#765a00]"
              aria-label={`${openCount} open comments`}
            >
              Open ({openCount})
            </span>
            <span
              className="rounded-full bg-[#eceae5] px-2.5 py-1 text-[#66615a]"
              aria-label={`${resolvedCount} resolved comments`}
            >
              Resolved ({resolvedCount})
            </span>
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-[#343438]">
            <span>Show resolved comments</span>
            <input
              type="checkbox"
              id="show-resolved-comments"
              checked={showResolvedComments}
              onChange={(event) =>
                onShowResolvedComments(event.target.checked)
              }
              className="h-5 w-5 accent-[#0b5cad] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5cad]"
            />
          </label>
        </div>

        {mutationError && (
          <p role="alert" className="mx-1 mt-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
            {mutationError}
          </p>
        )}

        <div className="mt-3 space-y-3">
          {pendingComment && (
            <CreateCommentComposer
              key={pendingComment.selectedText}
              selectedText={pendingComment.selectedText}
              isSubmitting={mutation.some(
                (pendingMutation) => pendingMutation.kind === "create",
              )}
              onCancel={onCancelCreate}
              onSubmit={onCreate}
            />
          )}

          {isLoading ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-2xl bg-white px-4 py-5 text-sm text-[#6e6e73]"
            >
              Loading comments...
            </p>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={onRefresh}
                className="mt-3 rounded-full bg-white px-3 py-2 font-medium text-red-700 ring-1 ring-red-200"
              >
                Try again
              </button>
            </div>
          ) : visibleThreads.length === 0 && !pendingComment ? (
            <div className="rounded-2xl border border-dashed border-[#cbc8c0] bg-white px-4 py-6 text-center text-sm leading-6 text-[#6e6e73]">
              {threads.length === 0
                ? canComment
                  ? "Select text in the document and choose Add comment to start a discussion."
                  : "There are no comments on this document yet."
                : "All comments are resolved. Turn on Show resolved comments to review or reopen them."}
            </div>
          ) : (
            visibleThreads.map((thread) => (
              <div
                key={thread.id}
                ref={(element) => {
                  if (element) {
                    threadElements.current.set(thread.id, element);
                  } else {
                    threadElements.current.delete(thread.id);
                  }
                }}
              >
                <CommentThreadCard
                  thread={thread}
                  isActive={thread.id === activeThreadId}
                  isAnchored={anchoredThreadIds.has(thread.id)}
                  canComment={canComment}
                  isBusy={mutation.some(
                    (pendingMutation) =>
                      pendingMutation.kind !== "create" &&
                      pendingMutation.threadId === thread.id,
                  )}
                  isReplying={mutation.some(
                    (pendingMutation) =>
                      pendingMutation.kind === "reply" &&
                      pendingMutation.threadId === thread.id,
                  )}
                  isChangingStatus={mutation.some(
                    (pendingMutation) =>
                      pendingMutation.kind === "status" &&
                      pendingMutation.threadId === thread.id,
                  )}
                  onSelect={() => onSelectThread(thread.id)}
                  onReply={(message) => onReply(thread.id, message)}
                  onChangeStatus={(resolved) =>
                    onChangeStatus(thread.id, resolved)
                  }
                />
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
