import type { Editor } from "@tiptap/core";
import type { CommentThread } from "@/lib/api";

export type CommentRange = {
  from: number;
  to: number;
};

export function findCommentThreadRange(
  editor: Editor | null,
  threadId: string,
): CommentRange | null {
  if (!editor) {
    return null;
  }

  let range: CommentRange | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) {
      return;
    }

    const carriesThread = node.marks.some(
      (mark) =>
        mark.type.name === "commentThread" && mark.attrs.threadId === threadId,
    );

    if (!carriesThread) {
      return;
    }

    const nodeEnd = pos + node.nodeSize;

    range = range
      ? { from: Math.min(range.from, pos), to: Math.max(range.to, nodeEnd) }
      : { from: pos, to: nodeEnd };
  });

  return range;
}

export function getAnchoredCommentThreadIds(editor: Editor | null): Set<string> {
  const threadIds = new Set<string>();

  if (!editor) {
    return threadIds;
  }

  editor.state.doc.descendants((node) => {
    if (!node.isText) {
      return;
    }

    for (const mark of node.marks) {
      if (mark.type.name !== "commentThread") {
        continue;
      }

      const threadId = mark.attrs.threadId;

      if (typeof threadId === "string" && threadId) {
        threadIds.add(threadId);
      }
    }
  });

  return threadIds;
}

export function focusCommentThread(
  editor: Editor | null,
  threadId: string,
): boolean {
  const range = findCommentThreadRange(editor, threadId);

  if (!editor || !range) {
    return false;
  }

  return editor
    .chain()
    .focus()
    .setTextSelection(range)
    .scrollIntoView()
    .run();
}

export function syncCommentMarkClasses(
  editor: Editor | null,
  threads: CommentThread[],
  activeThreadId: string | null,
) {
  const editorElement = editor?.view.dom;

  if (!editorElement) {
    return;
  }

  const statuses = new Map(threads.map((thread) => [thread.id, thread.status]));
  const knownThreadIds = new Set(statuses.keys());

  editorElement
    .querySelectorAll<HTMLElement>("[data-comment-thread-id]")
    .forEach((element) => {
      const threadId = element.dataset.commentThreadId;

      element.classList.toggle("is-active", threadId === activeThreadId);
      element.classList.toggle(
        "is-resolved",
        Boolean(threadId && statuses.get(threadId) === "RESOLVED"),
      );
      element.classList.toggle(
        "is-unknown",
        Boolean(threadId && !knownThreadIds.has(threadId)),
      );
    });
}
