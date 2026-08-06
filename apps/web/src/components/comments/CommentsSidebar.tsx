"use client";

import { useEffect, useRef } from "react";
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
  mutation: CommentMutation;
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
  const openCount = threads.filter((thread) => thread.status === "OPEN").length;
  const resolvedCount = threads.length - openCount;
  const visibleThreads = showResolvedComments
    ? threads
    : threads.filter((thread) => thread.status === "OPEN");

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    threadElements.current.get(activeThreadId)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeThreadId, showResolvedComments]);

  return (
    <aside
      className="w-full shrink-0 xl:w-[360px]"
      aria-label="Document comments"
    >
      <div className="rounded-[1.7rem] border border-[#dedbd3] bg-[#fbfaf7] p-3 shadow-sm xl:sticky xl:top-[188px] xl:max-h-[calc(100vh-212px)] xl:overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-2 py-2">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#1d1d1f]">
              Comments
            </h2>
            <p className="mt-1 text-sm text-[#6e6e73]">
              Updates appear live for everyone in this document.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[#4f555c] transition hover:bg-white"
              aria-label="Close comments"
              title="Close comments"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mx-1 mt-2 rounded-2xl border border-[#dedbd3] bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#6e6e73]">
            <span className="rounded-full bg-[#fff3c4] px-2.5 py-1 text-[#765a00]">
              Open ({openCount})
            </span>
            <span className="rounded-full bg-[#eceae5] px-2.5 py-1 text-[#66615a]">
              Resolved ({resolvedCount})
            </span>
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-[#343438]">
            <span>Show resolved comments</span>
            <input
              type="checkbox"
              checked={showResolvedComments}
              onChange={(event) =>
                onShowResolvedComments(event.target.checked)
              }
              className="h-4 w-4 accent-[#0b5cad]"
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
              isSubmitting={mutation?.kind === "create"}
              onCancel={onCancelCreate}
              onSubmit={onCreate}
            />
          )}

          {isLoading ? (
            <p className="rounded-2xl bg-white px-4 py-5 text-sm text-[#6e6e73]">
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
                  isReplying={
                    mutation?.kind === "reply" &&
                    mutation.threadId === thread.id
                  }
                  isChangingStatus={
                    mutation?.kind === "status" &&
                    mutation.threadId === thread.id
                  }
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
