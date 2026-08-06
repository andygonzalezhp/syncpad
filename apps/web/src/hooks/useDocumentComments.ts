"use client";

import type {
  HocuspocusProvider,
  onStatelessParameters,
} from "@hocuspocus/provider";
import { useEffect, useRef, useState } from "react";
import type { CommentThread } from "@/lib/api";
import { commentDebug } from "@/lib/commentDebug";
import {
  parseCommentSyncEvent,
  serializeCommentSyncEvent,
  type CommentSyncEventType,
} from "@/lib/commentSync";
import { useSyncPadApi } from "@/lib/useSyncPadApi";

export type CommentMutation =
  | { operationId: string; kind: "create" }
  | {
      operationId: string;
      kind: "reply" | "status";
      threadId: string;
    };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function compareThreadFreshness(
  candidate: CommentThread,
  existing: CommentThread,
): number {
  const candidateTime = Date.parse(candidate.updatedAt);
  const existingTime = Date.parse(existing.updatedAt);

  if (!Number.isNaN(candidateTime) && !Number.isNaN(existingTime)) {
    if (candidateTime !== existingTime) {
      return candidateTime - existingTime;
    }

    // OffsetDateTime can contain more precision than JavaScript's millisecond
    // timestamps. Compare the remaining fractional digits when both values fall
    // within the same JavaScript millisecond.
    const fractionalRemainder = (timestamp: string) => {
      const fraction = timestamp.match(
        /\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/,
      )?.[1];

      return Number((fraction ?? "").padEnd(9, "0").slice(3, 9) || "0");
    };
    const fractionalDifference =
      fractionalRemainder(candidate.updatedAt) -
      fractionalRemainder(existing.updatedAt);

    if (fractionalDifference !== 0) {
      return fractionalDifference;
    }
  }

  return candidate.messages.length - existing.messages.length;
}

function mergeCommentThreads(
  current: CommentThread[],
  incoming: CommentThread[],
): CommentThread[] {
  const merged = new Map(current.map((thread) => [thread.id, thread]));

  for (const thread of incoming) {
    const existing = merged.get(thread.id);

    if (!existing || compareThreadFreshness(thread, existing) >= 0) {
      merged.set(thread.id, thread);
    }
  }

  return Array.from(merged.values()).sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  );
}

export function useDocumentComments(
  documentId: string,
  provider: HocuspocusProvider,
) {
  const {
    isAuthReady,
    listComments,
    getComment,
    createComment: createCommentRequest,
    addCommentReply,
    setCommentResolved,
  } = useSyncPadApi();

  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localMutationError, setLocalMutationError] = useState<string | null>(
    null,
  );
  const [realtimeErrors, setRealtimeErrors] = useState<Record<string, string>>(
    {},
  );
  const [mutations, setMutations] = useState<CommentMutation[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showResolvedComments, setShowResolvedCommentsState] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const listRequestSequence = useRef(0);
  const dataRevision = useRef(0);
  const realtimeRefreshSequence = useRef(new Map<string, number>());
  const mutationSequence = useRef(0);
  const mutationLocks = useRef(new Map<string, string>());
  const activeThreadIdRef = useRef(activeThreadId);
  const showResolvedCommentsRef = useRef(showResolvedComments);
  const threadsRef = useRef(threads);
  const currentDocumentIdRef = useRef(documentId);

  if (currentDocumentIdRef.current !== documentId) {
    currentDocumentIdRef.current = documentId;
    dataRevision.current = 0;
    listRequestSequence.current += 1;
    realtimeRefreshSequence.current.clear();
    mutationLocks.current.clear();
  }

  activeThreadIdRef.current = activeThreadId;
  showResolvedCommentsRef.current = showResolvedComments;
  threadsRef.current = threads;

  const realtimeError = Object.values(realtimeErrors)[0] ?? null;
  const mutationError = localMutationError ?? realtimeError;

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    let cancelled = false;
    const requestId = ++listRequestSequence.current;
    const revisionAtStart = dataRevision.current;
    const requestedDocumentId = documentId;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const comments = await listComments(documentId);

        if (
          !cancelled &&
          requestId === listRequestSequence.current &&
          requestedDocumentId === currentDocumentIdRef.current
        ) {
          const activeThread = comments.find(
            (thread) => thread.id === activeThreadIdRef.current,
          );

          if (
            activeThread?.status === "RESOLVED" &&
            !showResolvedCommentsRef.current
          ) {
            showResolvedCommentsRef.current = true;
            setShowResolvedCommentsState(true);
          }

          setThreads((current) =>
            dataRevision.current === revisionAtStart
              ? comments
              : mergeCommentThreads(current, comments),
          );
          setRealtimeErrors({});
        }
      } catch (error) {
        if (!cancelled && requestId === listRequestSequence.current) {
          setLoadError(errorMessage(error, "Could not load comments."));
        }
      } finally {
        if (!cancelled && requestId === listRequestSequence.current) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // The API hook functions intentionally follow the existing app convention.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, isAuthReady, refreshVersion]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    let cancelled = false;

    function handleStatelessMessage({ payload }: onStatelessParameters) {
      const event = parseCommentSyncEvent(payload);

      if (!event) {
        return;
      }

      const sequence =
        (realtimeRefreshSequence.current.get(event.threadId) ?? 0) + 1;

      realtimeRefreshSequence.current.set(event.threadId, sequence);
      commentDebug("realtime comment event received", event);

      void (async () => {
        try {
          const thread = await getComment(documentId, event.threadId);

          if (
            cancelled ||
            documentId !== currentDocumentIdRef.current ||
            realtimeRefreshSequence.current.get(event.threadId) !== sequence
          ) {
            commentDebug("stale realtime thread response ignored", {
              ...event,
              sequence,
            });
            return;
          }

          replaceThread(thread, `realtime:${event.type}`);
          setRealtimeErrors((current) => {
            if (!(event.threadId in current)) {
              return current;
            }

            const next = { ...current };
            delete next[event.threadId];
            return next;
          });
        } catch (error) {
          if (
            cancelled ||
            documentId !== currentDocumentIdRef.current ||
            realtimeRefreshSequence.current.get(event.threadId) !== sequence
          ) {
            return;
          }

          commentDebug("realtime thread refresh failed", {
            ...event,
            error: errorMessage(error, "Unknown realtime refresh error."),
          });
          setRealtimeErrors((current) => ({
            ...current,
            [event.threadId]:
              "A comment changed in another session, but the update could not be loaded.",
          }));
        }
      })();
    }

    provider.on("stateless", handleStatelessMessage);

    return () => {
      cancelled = true;
      provider.off("stateless", handleStatelessMessage);
    };
    // The API hook follows the existing app convention and is safe to use from
    // the provider callback for this document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, isAuthReady, provider]);

  useEffect(() => {
    let hasCompletedSync = provider.synced;

    function handleSynced() {
      if (hasCompletedSync) {
        commentDebug("collaboration reconnected; reconciling comments", {
          documentId,
        });
        setRefreshVersion((current) => current + 1);
      }

      hasCompletedSync = true;
    }

    provider.on("synced", handleSynced);

    return () => {
      provider.off("synced", handleSynced);
    };
  }, [documentId, provider]);

  function replaceThread(updatedThread: CommentThread, source: string) {
    if (updatedThread.documentId !== currentDocumentIdRef.current) {
      commentDebug("thread update ignored for inactive document", {
        source,
        threadId: updatedThread.id,
        threadDocumentId: updatedThread.documentId,
        activeDocumentId: currentDocumentIdRef.current,
      });
      return;
    }

    const existingSnapshot = threadsRef.current.find(
      (thread) => thread.id === updatedThread.id,
    );

    if (
      existingSnapshot &&
      compareThreadFreshness(updatedThread, existingSnapshot) < 0
    ) {
      commentDebug("stale thread update ignored", {
        source,
        threadId: updatedThread.id,
        currentUpdatedAt: existingSnapshot.updatedAt,
        incomingUpdatedAt: updatedThread.updatedAt,
      });
      return;
    }

    dataRevision.current += 1;

    if (
      updatedThread.status === "RESOLVED" &&
      !showResolvedCommentsRef.current &&
      activeThreadIdRef.current === updatedThread.id
    ) {
      activeThreadIdRef.current = null;
      setActiveThreadId(null);
    }

    setThreads((current) => {
      const existingIndex = current.findIndex(
        (thread) => thread.id === updatedThread.id,
      );

      if (
        existingIndex !== -1 &&
        compareThreadFreshness(updatedThread, current[existingIndex]) < 0
      ) {
        return current;
      }

      const next =
        existingIndex === -1
          ? [...current, updatedThread]
          : current.map((thread) =>
              thread.id === updatedThread.id ? updatedThread : thread,
            );

      commentDebug("local thread state replaced", {
        source,
        threadId: updatedThread.id,
        previousThread: current[existingIndex] ?? null,
        updatedThread,
        nextThreadCount: next.length,
      });

      return next;
    });
  }

  function mutationKey(mutation: CommentMutation): string {
    return mutation.kind === "create"
      ? "create"
      : `thread:${mutation.threadId}`;
  }

  function beginMutation(
    mutation:
      | { kind: "create" }
      | { kind: "reply" | "status"; threadId: string },
  ): CommentMutation | null {
    const operationId = `${documentId}:${++mutationSequence.current}`;
    const pendingMutation = { ...mutation, operationId } as CommentMutation;
    const key = mutationKey(pendingMutation);

    if (mutationLocks.current.has(key)) {
      return null;
    }

    mutationLocks.current.set(key, operationId);
    setMutations((current) => [...current, pendingMutation]);
    return pendingMutation;
  }

  function finishMutation(mutation: CommentMutation) {
    const key = mutationKey(mutation);

    if (mutationLocks.current.get(key) === mutation.operationId) {
      mutationLocks.current.delete(key);
    }

    setMutations((current) =>
      current.filter(
        (pending) => pending.operationId !== mutation.operationId,
      ),
    );
  }

  function publishCommentEvent(
    type: CommentSyncEventType,
    threadId: string,
  ) {
    const event = { type, threadId };

    try {
      provider.sendStateless(serializeCommentSyncEvent(event));
      commentDebug("realtime comment event sent", event);
    } catch (error) {
      commentDebug("realtime comment event send failed", {
        ...event,
        error: errorMessage(error, "Unknown realtime send error."),
      });
    }
  }

  async function createComment(
    selectedText: string,
    message: string,
  ): Promise<CommentThread> {
    const pendingMutation = beginMutation({ kind: "create" });

    if (!pendingMutation) {
      throw new Error("A comment is already being added.");
    }

    const requestedDocumentId = documentId;

    try {
      setLocalMutationError(null);

      const thread = await createCommentRequest(
        documentId,
        selectedText.trim(),
        message.trim(),
      );

      if (requestedDocumentId === currentDocumentIdRef.current) {
        replaceThread(thread, "create");
        activeThreadIdRef.current = thread.id;
        setActiveThreadId(thread.id);
        setIsPanelOpen(true);
      }

      return thread;
    } catch (error) {
      const messageText = errorMessage(error, "Could not create comment.");
      if (requestedDocumentId === currentDocumentIdRef.current) {
        setLocalMutationError(messageText);
      }
      throw error;
    } finally {
      finishMutation(pendingMutation);
    }
  }

  async function replyToThread(threadId: string, message: string) {
    const pendingMutation = beginMutation({ kind: "reply", threadId });

    if (!pendingMutation) {
      throw new Error("A request for this comment is already in progress.");
    }

    const requestedDocumentId = documentId;

    try {
      commentDebug("reply mutation started", {
        documentId,
        threadId,
        messageLength: message.trim().length,
      });
      setLocalMutationError(null);

      const thread = await addCommentReply(
        documentId,
        threadId,
        message.trim(),
      );

      commentDebug("reply mutation received API thread", thread);
      if (requestedDocumentId === currentDocumentIdRef.current) {
        replaceThread(thread, "reply");
        publishCommentEvent("COMMENT_REPLY_CREATED", thread.id);
      }
    } catch (error) {
      if (requestedDocumentId === currentDocumentIdRef.current) {
        setLocalMutationError(errorMessage(error, "Could not add reply."));
      }
      throw error;
    } finally {
      finishMutation(pendingMutation);
    }
  }

  async function changeThreadStatus(threadId: string, resolved: boolean) {
    const pendingMutation = beginMutation({ kind: "status", threadId });

    if (!pendingMutation) {
      return;
    }

    const requestedDocumentId = documentId;

    try {
      commentDebug("status mutation started", {
        documentId,
        threadId,
        requestedStatus: resolved ? "RESOLVED" : "OPEN",
      });
      setLocalMutationError(null);

      const thread = await setCommentResolved(
        documentId,
        threadId,
        resolved,
      );

      commentDebug("status mutation received API thread", thread);
      if (requestedDocumentId === currentDocumentIdRef.current) {
        replaceThread(thread, resolved ? "resolve" : "reopen");
        publishCommentEvent(
          resolved ? "COMMENT_RESOLVED" : "COMMENT_REOPENED",
          thread.id,
        );
      }
    } catch (error) {
      if (requestedDocumentId === currentDocumentIdRef.current) {
        setLocalMutationError(
          errorMessage(
            error,
            resolved
              ? "Could not resolve comment."
              : "Could not reopen comment.",
          ),
        );
      }
      throw error;
    } finally {
      finishMutation(pendingMutation);
    }
  }

  function activateThread(threadId: string) {
    if (
      threadsRef.current.some(
        (thread) =>
          thread.id === threadId && thread.status === "RESOLVED",
      )
    ) {
      showResolvedCommentsRef.current = true;
      setShowResolvedCommentsState(true);
    }

    activeThreadIdRef.current = threadId;
    setActiveThreadId(threadId);
    setIsPanelOpen(true);
  }

  function updateShowResolvedComments(show: boolean) {
    showResolvedCommentsRef.current = show;
    setShowResolvedCommentsState(show);

    if (!show && activeThreadIdRef.current) {
      const activeThread = threadsRef.current.find(
        (thread) => thread.id === activeThreadIdRef.current,
      );

      if (activeThread?.status === "RESOLVED") {
        activeThreadIdRef.current = null;
        setActiveThreadId(null);
      }
    }
  }

  return {
    threads,
    isLoading,
    loadError,
    mutationError,
    mutation: mutations,
    activeThreadId,
    isPanelOpen,
    showResolvedComments,
    setIsPanelOpen,
    setShowResolvedComments: updateShowResolvedComments,
    setMutationError: setLocalMutationError,
    activateThread,
    createComment,
    publishCommentEvent,
    replyToThread,
    changeThreadStatus,
    refreshComments: () => setRefreshVersion((current) => current + 1),
  };
}
