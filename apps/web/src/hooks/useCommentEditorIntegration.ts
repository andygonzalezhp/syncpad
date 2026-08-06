"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { useDocumentComments } from "@/hooks/useDocumentComments";
import {
  focusCommentThread,
  getAnchoredCommentThreadIds,
  syncCommentMarkClasses,
} from "@/lib/comments";

type DocumentComments = ReturnType<typeof useDocumentComments>;

type PendingComment = {
  from: number;
  to: number;
  selectedText: string;
};

type UseCommentEditorIntegrationOptions = {
  editor: Editor | null;
  canComment: boolean;
  syncStatus: string;
  comments: DocumentComments;
};

export function useCommentEditorIntegration({
  editor,
  canComment,
  syncStatus,
  comments,
}: UseCommentEditorIntegrationOptions) {
  const [pendingComment, setPendingComment] = useState<PendingComment | null>(
    null,
  );
  const [anchoredThreadIds, setAnchoredThreadIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!editor || syncStatus !== "synced") {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setAnchoredThreadIds(getAnchoredCommentThreadIds(editor));
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [editor, syncStatus, comments.threads]);

  useEffect(() => {
    syncCommentMarkClasses(
      editor,
      comments.threads,
      comments.activeThreadId,
    );
  }, [editor, comments.threads, comments.activeThreadId]);

  function startComment() {
    if (!editor || !canComment) {
      return;
    }

    const { from, to } = editor.state.selection;
    const selectionText = editor.state.doc.textBetween(from, to, " ").trim();

    if (!selectionText) {
      comments.setMutationError("Select some text before adding a comment.");
      return;
    }

    if (selectionText.length > 2_000) {
      comments.setMutationError(
        "Comment selections can contain at most 2,000 characters.",
      );
      return;
    }

    comments.setMutationError(null);
    comments.setIsPanelOpen(true);
    setPendingComment({ from, to, selectedText: selectionText });
  }

  async function createPendingComment(message: string) {
    if (!editor || !pendingComment) {
      return;
    }

    const selection = pendingComment;
    const thread = await comments.createComment(selection.selectedText, message);
    const hasValidRange =
      selection.from >= 0 &&
      selection.to <= editor.state.doc.content.size &&
      selection.from < selection.to;
    let anchored = false;

    if (hasValidRange) {
      try {
        const currentSelectionText = editor.state.doc
          .textBetween(selection.from, selection.to, " ")
          .trim();

        anchored =
          currentSelectionText === selection.selectedText &&
          editor
            .chain()
            .focus()
            .setTextSelection({ from: selection.from, to: selection.to })
            .setMark("commentThread", { threadId: thread.id })
            .scrollIntoView()
            .run();
      } catch {
        anchored = false;
      }
    }

    setPendingComment(null);
    comments.publishCommentEvent("COMMENT_CREATED", thread.id);

    if (!anchored) {
      comments.setMutationError(
        "The comment was saved, but its selected text changed before the highlight could be added. The thread remains available here.",
      );
      setAnchoredThreadIds((current) => {
        const next = new Set(current);
        next.delete(thread.id);
        return next;
      });
      return;
    }

    setAnchoredThreadIds((current) => new Set(current).add(thread.id));
    syncCommentMarkClasses(editor, [...comments.threads, thread], thread.id);
  }

  function selectCommentThread(threadId: string) {
    comments.activateThread(threadId);

    if (!focusCommentThread(editor, threadId)) {
      setAnchoredThreadIds((current) => {
        const next = new Set(current);
        next.delete(threadId);
        return next;
      });
    }
  }

  return {
    pendingComment,
    anchoredThreadIds,
    startComment,
    createPendingComment,
    selectCommentThread,
    cancelPendingComment: () => setPendingComment(null),
  };
}
