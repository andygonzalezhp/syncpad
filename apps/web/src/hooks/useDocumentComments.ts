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
  | { kind: "create" }
  | { kind: "reply" | "status"; threadId: string }
  | null;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
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
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutation, setMutation] = useState<CommentMutation>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showResolvedComments, setShowResolvedCommentsState] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const realtimeRefreshSequence = useRef(new Map<string, number>());
  const activeThreadIdRef = useRef(activeThreadId);
  const showResolvedCommentsRef = useRef(showResolvedComments);

  activeThreadIdRef.current = activeThreadId;
  showResolvedCommentsRef.current = showResolvedComments;

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const comments = await listComments(documentId);

        if (!cancelled) {
          setThreads(comments);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(errorMessage(error, "Could not load comments."));
        }
      } finally {
        if (!cancelled) {
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
            realtimeRefreshSequence.current.get(event.threadId) !== sequence
          ) {
            commentDebug("stale realtime thread response ignored", {
              ...event,
              sequence,
            });
            return;
          }

          replaceThread(thread, `realtime:${event.type}`);
          setMutationError(null);
        } catch (error) {
          if (
            realtimeRefreshSequence.current.get(event.threadId) !== sequence
          ) {
            return;
          }

          commentDebug("realtime thread refresh failed", {
            ...event,
            error: errorMessage(error, "Unknown realtime refresh error."),
          });
          setMutationError(
            "A comment changed in another session, but the update could not be loaded.",
          );
        }
      })();
    }

    provider.on("stateless", handleStatelessMessage);

    return () => {
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
    try {
      setMutation({ kind: "create" });
      setMutationError(null);

      const thread = await createCommentRequest(
        documentId,
        selectedText.trim(),
        message.trim(),
      );

      replaceThread(thread, "create");
      activeThreadIdRef.current = thread.id;
      setActiveThreadId(thread.id);
      setIsPanelOpen(true);

      return thread;
    } catch (error) {
      const messageText = errorMessage(error, "Could not create comment.");
      setMutationError(messageText);
      throw error;
    } finally {
      setMutation(null);
    }
  }

  async function replyToThread(threadId: string, message: string) {
    try {
      commentDebug("reply mutation started", {
        documentId,
        threadId,
        messageLength: message.trim().length,
      });
      setMutation({ kind: "reply", threadId });
      setMutationError(null);

      const thread = await addCommentReply(
        documentId,
        threadId,
        message.trim(),
      );

      commentDebug("reply mutation received API thread", thread);
      replaceThread(thread, "reply");
      publishCommentEvent("COMMENT_REPLY_CREATED", thread.id);
    } catch (error) {
      setMutationError(errorMessage(error, "Could not add reply."));
      throw error;
    } finally {
      setMutation(null);
    }
  }

  async function changeThreadStatus(threadId: string, resolved: boolean) {
    try {
      commentDebug("status mutation started", {
        documentId,
        threadId,
        requestedStatus: resolved ? "RESOLVED" : "OPEN",
      });
      setMutation({ kind: "status", threadId });
      setMutationError(null);

      const thread = await setCommentResolved(
        documentId,
        threadId,
        resolved,
      );

      commentDebug("status mutation received API thread", thread);
      replaceThread(thread, resolved ? "resolve" : "reopen");
      publishCommentEvent(
        resolved ? "COMMENT_RESOLVED" : "COMMENT_REOPENED",
        thread.id,
      );
    } catch (error) {
      setMutationError(
        errorMessage(
          error,
          resolved ? "Could not resolve comment." : "Could not reopen comment.",
        ),
      );
      throw error;
    } finally {
      setMutation(null);
    }
  }

  function activateThread(threadId: string) {
    if (
      threads.some(
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
      const activeThread = threads.find(
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
    mutation,
    activeThreadId,
    isPanelOpen,
    showResolvedComments,
    setIsPanelOpen,
    setShowResolvedComments: updateShowResolvedComments,
    setMutationError,
    activateThread,
    createComment,
    publishCommentEvent,
    replyToThread,
    changeThreadStatus,
    refreshComments: () => setRefreshVersion((current) => current + 1),
  };
}
