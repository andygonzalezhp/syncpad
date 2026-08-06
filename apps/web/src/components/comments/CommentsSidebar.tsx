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
      className="syncpad-panel-enter fixed inset-x-2 bottom-2 z-50 sm:inset-x-4 sm:bottom-4 xl:static xl:z-auto xl:block xl:w-[370px] xl:shrink-0"
      aria-labelledby={headingId}
    >
      <div
        className="max-h-[85dvh] w-full overscroll-contain overflow-y-auto rounded-[1.5rem] bg-white/95 p-3 shadow-[0_24px_80px_rgba(20,20,18,0.16)] ring-1 ring-black/[0.07] backdrop-blur-xl xl:sticky xl:top-[170px] xl:max-h-[calc(100vh-194px)] xl:shadow-[0_1px_2px_rgba(20,20,18,0.04),0_14px_40px_rgba(20,20,18,0.06)]"
        aria-busy={isLoading || mutation.length > 0}
      >
        <div className="flex items-start justify-between gap-3 px-2 pb-3 pt-2">
          <div>
            <h2
              id={headingId}
              className="text-[1.15rem] font-semibold tracking-[-0.035em] text-[#20201e]"
            >
              Comments
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-[#85857f]">
              Updates appear live for everyone in this document.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              ref={closeButton}
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-[#6f6f69] transition duration-200 hover:bg-black/[0.045] hover:text-[#20201e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5]"
              aria-label="Close comments"
              title="Close comments"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mx-1 rounded-xl bg-[#f5f5f2] p-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#777771]">
            <span
              className="rounded-lg bg-white px-2.5 py-1.5 text-[#6d560f] shadow-sm ring-1 ring-black/[0.04]"
              aria-label={`${openCount} open comments`}
            >
              Open ({openCount})
            </span>
            <span
              className="rounded-lg px-2.5 py-1.5 text-[#777771]"
              aria-label={`${resolvedCount} resolved comments`}
            >
              Resolved ({resolvedCount})
            </span>
          </div>

          <label className="mt-2.5 flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1 text-[13px] font-medium text-[#555550]">
            <span>Show resolved comments</span>
            <input
              type="checkbox"
              id="show-resolved-comments"
              checked={showResolvedComments}
              onChange={(event) =>
                onShowResolvedComments(event.target.checked)
              }
              className="h-4 w-4 accent-[#4f46e5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5]"
            />
          </label>
        </div>

        {mutationError && (
          <p role="alert" className="mx-1 mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 ring-1 ring-red-200">
            {mutationError}
          </p>
        )}

        <div className="mt-2.5 space-y-2.5">
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
              className="rounded-xl bg-[#f7f7f4] px-4 py-5 text-sm text-[#777771]"
            >
              Loading comments...
            </p>
          ) : loadError ? (
            <div className="rounded-xl bg-red-50 px-4 py-4 text-sm text-red-700 ring-1 ring-red-200">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={onRefresh}
                className="mt-3 rounded-lg bg-white px-3 py-2 font-medium text-red-700 ring-1 ring-red-200"
              >
                Try again
              </button>
            </div>
          ) : visibleThreads.length === 0 && !pendingComment ? (
            <div className="rounded-xl bg-[#f7f7f4] px-4 py-7 text-center text-sm leading-6 text-[#777771] ring-1 ring-inset ring-black/[0.05]">
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
