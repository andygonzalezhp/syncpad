"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChainedCommands, Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import {
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
  useHocuspocusSyncStatus,
} from "@hocuspocus/provider-react";
import CommentsSidebar from "@/components/comments/CommentsSidebar";
import { CommentThreadMark } from "@/extensions/CommentThreadMark";
import { useCommentEditorIntegration } from "@/hooks/useCommentEditorIntegration";
import { useDocumentComments } from "@/hooks/useDocumentComments";
import { DocumentRole } from "@/lib/api";

type CurrentUser = {
  email: string;
  name: string;
  color: string;
  role: DocumentRole;
};

type CollaborativeEditorProps = {
  documentId: string;
  currentUser: CurrentUser;
  currentUserRole: DocumentRole;
};

type AwarenessState = {
  clientId: number;
  name?: string;
  color?: string;
  user?: {
    email?: string;
    name?: string;
    color?: string;
    role?: DocumentRole;
  };
};

type OnlineUser = {
  key: string;
  email?: string;
  name: string;
  color: string;
  role?: DocumentRole;
  clientCount: number;
};

type EditorStats = {
  words: number;
  characters: number;
};

type OutlineItem = {
  id: string;
  level: number;
  text: string;
  pos: number;
};

type FindMatch = {
  from: number;
  to: number;
};

type MenuName = "file" | "edit" | "view" | "insert" | "format" | "table" | null;

const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", serif' },
  { label: "Courier New", value: '"Courier New", monospace' },
];

const FONT_SIZES = [
  "8",
  "9",
  "10",
  "11",
  "12",
  "14",
  "16",
  "18",
  "24",
  "32",
  "48",
];

const LINE_HEIGHTS = ["1", "1.15", "1.5", "2"];

function getAwarenessUser(state: AwarenessState) {
  return {
    email: state.user?.email,
    name: state.user?.name ?? state.name ?? "Guest",
    color: state.user?.color ?? state.color ?? "#737373",
    role: state.user?.role,
  };
}

function buildOnlineUsers(awareness: AwarenessState[]): OnlineUser[] {
  const usersByKey = new Map<string, OnlineUser>();

  for (const state of awareness) {
    const user = getAwarenessUser(state);
    const key = user.email ?? `${user.name}-${state.clientId}`;

    const existing = usersByKey.get(key);

    if (existing) {
      existing.clientCount += 1;
      continue;
    }

    usersByKey.set(key, {
      key,
      email: user.email,
      name: user.name,
      color: user.color,
      role: user.role,
      clientCount: 1,
    });
  }

  return Array.from(usersByKey.values());
}

function calculateStats(text: string): EditorStats {
  const normalizedText = text.trim();

  return {
    words: normalizedText ? normalizedText.split(/\s+/).length : 0,
    characters: text.length,
  };
}

function runCommand(
  editor: Editor | null,
  command: (chain: ChainedCommands) => void,
) {
  if (!editor) {
    return;
  }

  command(editor.chain().focus());
}

function getBlockFormat(editor: Editor | null): string {
  if (!editor) {
    return "paragraph";
  }

  if (editor.isActive("heading", { level: 1 })) {
    return "h1";
  }

  if (editor.isActive("heading", { level: 2 })) {
    return "h2";
  }

  if (editor.isActive("heading", { level: 3 })) {
    return "h3";
  }

  if (editor.isActive("codeBlock")) {
    return "codeBlock";
  }

  if (editor.isActive("blockquote")) {
    return "blockquote";
  }

  return "paragraph";
}

function applyBlockFormat(editor: Editor | null, value: string) {
  runCommand(editor, (chain) => {
    if (value === "paragraph") {
      chain.setParagraph().run();
      return;
    }

    if (value === "h1") {
      chain.toggleHeading({ level: 1 }).run();
      return;
    }

    if (value === "h2") {
      chain.toggleHeading({ level: 2 }).run();
      return;
    }

    if (value === "h3") {
      chain.toggleHeading({ level: 3 }).run();
      return;
    }

    if (value === "blockquote") {
      chain.toggleBlockquote().run();
      return;
    }

    if (value === "codeBlock") {
      chain.toggleCodeBlock().run();
    }
  });
}

function setLink(editor: Editor | null) {
  if (!editor) {
    return;
  }

  const previousUrl = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Enter link URL", previousUrl ?? "https://");

  if (url === null) {
    return;
  }

  if (!url.trim()) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

function insertImageByUrl(editor: Editor | null) {
  if (!editor) {
    return;
  }

  const src = window.prompt("Paste image URL");

  if (!src?.trim()) {
    return;
  }

  editor.chain().focus().setImage({ src: src.trim() }).run();
}

function downloadFile(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

function exportHtml(editor: Editor | null) {
  if (!editor) {
    return;
  }

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SyncPad Export</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 816px;
      margin: 48px auto;
      line-height: 1.5;
      color: #1d1d1f;
    }

    img {
      max-width: 100%;
      height: auto;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    td,
    th {
      border: 1px solid #dadce0;
      padding: 8px;
      vertical-align: top;
    }

    blockquote {
      border-left: 4px solid #dadce0;
      color: #5f6368;
      padding-left: 16px;
    }

    pre {
      background: #1d1d1f;
      color: #f5f5f7;
      padding: 16px;
      border-radius: 12px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
${editor.getHTML()}
</body>
</html>`;

  downloadFile("syncpad-document.html", html, "text/html");
}

function exportText(editor: Editor | null) {
  if (!editor) {
    return;
  }

  downloadFile("syncpad-document.txt", editor.getText(), "text/plain");
}

async function copyPlainText(editor: Editor | null) {
  if (!editor) {
    return;
  }

  await navigator.clipboard.writeText(editor.getText());
}

function buildOutline(editor: Editor | null): OutlineItem[] {
  if (!editor) {
    return [];
  }

  const items: OutlineItem[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") {
      return;
    }

    const text = node.textContent.trim();

    if (!text) {
      return;
    }

    items.push({
      id: `${pos}-${text}`,
      level: node.attrs.level ?? 1,
      text,
      pos,
    });
  });

  return items;
}

function jumpToPosition(editor: Editor | null, pos: number) {
  if (!editor) {
    return;
  }

  editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
}

function findMatchesInDocument(
  editor: Editor | null,
  query: string,
): FindMatch[] {
  if (!editor || !query.trim()) {
    return [];
  }

  const matches: FindMatch[] = [];
  const normalizedQuery = query.toLowerCase();

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const lowerText = node.text.toLowerCase();
    let index = lowerText.indexOf(normalizedQuery);

    while (index !== -1) {
      matches.push({
        from: pos + index,
        to: pos + index + query.length,
      });

      index = lowerText.indexOf(normalizedQuery, index + normalizedQuery.length);
    }
  });

  return matches;
}

function selectFindMatch(editor: Editor | null, match: FindMatch | undefined) {
  if (!editor || !match) {
    return;
  }

  editor
    .chain()
    .focus()
    .setTextSelection({
      from: match.from,
      to: match.to,
    })
    .scrollIntoView()
    .run();
}

function replaceFindMatch(
  editor: Editor | null,
  match: FindMatch | undefined,
  replacement: string,
) {
  if (!editor || !match) {
    return;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(
      {
        from: match.from,
        to: match.to,
      },
      replacement,
    )
    .run();
}

function replaceAllMatches(
  editor: Editor | null,
  matches: FindMatch[],
  replacement: string,
) {
  if (!editor || matches.length === 0) {
    return;
  }

  const sortedMatches = [...matches].sort((a, b) => b.from - a.from);
  let chain = editor.chain().focus();

  for (const match of sortedMatches) {
    chain = chain.insertContentAt(
      {
        from: match.from,
        to: match.to,
      },
      replacement,
    );
  }

  chain.run();
}

export default function CollaborativeEditor({
  documentId,
  currentUser,
  currentUserRole,
}: CollaborativeEditorProps) {
  const provider = useHocuspocusProvider();
  const awareness = useHocuspocusAwareness() as AwarenessState[];
  const connectionStatus = useHocuspocusConnectionStatus();
  const syncStatus = useHocuspocusSyncStatus();
  const comments = useDocumentComments(documentId, provider);

  const [stats, setStats] = useState<EditorStats>({
    words: 0,
    characters: 0,
  });

  const [editorUiTick, setEditorUiTick] = useState(0);
  const [activeMenu, setActiveMenu] = useState<MenuName>(null);
  const [showRuler, setShowRuler] = useState(true);
  const [showOutline, setShowOutline] = useState(true);
  const [printLayout, setPrintLayout] = useState(true);
  const [zoom, setZoom] = useState("100");
  const [showFindPanel, setShowFindPanel] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const canEdit = currentUserRole === "OWNER" || currentUserRole === "EDITOR";
  const onlineUsers = buildOnlineUsers(awareness);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if (event.key === "Escape") {
        setActiveMenu(null);
        setShowFindPanel(false);
      }

      if ((event.metaKey || event.ctrlKey) && key === "f") {
        event.preventDefault();
        setActiveMenu(null);
        setShowFindPanel(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: canEdit,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),

        TextStyleKit,

        Underline,
        Subscript,
        Superscript,

        Highlight.configure({
          multicolor: true,
        }),

        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),

        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        }),

        Image.configure({
          allowBase64: true,
          HTMLAttributes: {
            class: "syncpad-image",
          },
        }),

        TableKit.configure({
          table: {
            resizable: true,
          },
        }),

        TaskList,

        TaskItem.configure({
          nested: true,
        }),

        CommentThreadMark,

        Collaboration.configure({
          document: provider.document,
        }),

        CollaborationCaret.configure({
          provider,
          user: currentUser,
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "syncpad-editor min-h-[980px] px-[76px] py-[72px] text-[11pt] leading-[1.5] text-[#1d1d1f] outline-none",
        },
        handleClick(_view, _pos, event) {
          const target = event.target;

          if (!(target instanceof Element)) {
            return false;
          }

          const commentMark = target.closest<HTMLElement>(
            "[data-comment-thread-id]",
          );
          const threadId = commentMark?.dataset.commentThreadId;

          if (threadId) {
            comments.activateThread(threadId);
          }

          return false;
        },
      },
      onCreate({ editor }) {
        setStats(calculateStats(editor.getText()));
      },
      onUpdate({ editor }) {
        setStats(calculateStats(editor.getText()));
        setEditorUiTick((current) => current + 1);
      },
      onSelectionUpdate() {
        setEditorUiTick((current) => current + 1);
      },
      onTransaction() {
        setEditorUiTick((current) => current + 1);
      },
    },
    [
      provider,
      currentUser.email,
      currentUser.name,
      currentUser.color,
      currentUser.role,
      currentUserRole,
      canEdit,
    ],
  );

  const commentEditor = useCommentEditorIntegration({
    editor,
    canComment: canEdit,
    syncStatus,
    comments,
  });

  const outlineItems = useMemo(() => {
    void editorUiTick;
    return buildOutline(editor);
  }, [editor, editorUiTick]);

  const findMatches = useMemo(() => {
    void editorUiTick;
    return findMatchesInDocument(editor, findQuery);
  }, [editor, findQuery, editorUiTick]);

  const safeCurrentMatchIndex =
    findMatches.length === 0
      ? 0
      : Math.min(currentMatchIndex, findMatches.length - 1);

  const currentFindMatch =
    findMatches.length > 0 ? findMatches[safeCurrentMatchIndex] : undefined;

  const blockFormat = getBlockFormat(editor);
  const textStyleAttributes = editor?.getAttributes("textStyle") ?? {};

  const fontFamily =
    (textStyleAttributes.fontFamily as string | undefined) ??
    FONT_FAMILIES[0].value;

  const fontSize = (
    (textStyleAttributes.fontSize as string | undefined) ?? "11px"
  ).replace("px", "");

  const lineHeight =
    (textStyleAttributes.lineHeight as string | undefined) ?? "1.5";

  const selectedText = editor
    ? editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        " ",
      )
    : "";

  const hasSelection = selectedText.trim().length > 0;

  const isBold = Boolean(editor?.isActive("bold"));
  const isItalic = Boolean(editor?.isActive("italic"));
  const isUnderline = Boolean(editor?.isActive("underline"));
  const isStrike = Boolean(editor?.isActive("strike"));
  const isSubscript = Boolean(editor?.isActive("subscript"));
  const isSuperscript = Boolean(editor?.isActive("superscript"));
  const isLink = Boolean(editor?.isActive("link"));
  const isBulletList = Boolean(editor?.isActive("bulletList"));
  const isOrderedList = Boolean(editor?.isActive("orderedList"));
  const isTaskList = Boolean(editor?.isActive("taskList"));
  const isLeft = Boolean(editor?.isActive({ textAlign: "left" }));
  const isCenter = Boolean(editor?.isActive({ textAlign: "center" }));
  const isRight = Boolean(editor?.isActive({ textAlign: "right" }));
  const isJustify = Boolean(editor?.isActive({ textAlign: "justify" }));

  return (
    <section className="space-y-0">
      <div className="sticky top-0 z-30 border-b border-[#dedbd3] bg-[#f5f4f1]/95 px-3 pb-3 backdrop-blur-xl md:px-6">
        <div className="flex flex-wrap items-center gap-1 px-1 py-2 text-[0.95rem] text-[#1d1d1f]">
          <div className="relative">
            <MenuButton
              label="File"
              active={activeMenu === "file"}
              onClick={() =>
                setActiveMenu(activeMenu === "file" ? null : "file")
              }
            />

            {activeMenu === "file" && (
              <DropdownMenu>
                <DropdownItem
                  label="Export as HTML"
                  onClick={() => {
                    exportHtml(editor);
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Download as plain text"
                  onClick={() => {
                    exportText(editor);
                    setActiveMenu(null);
                  }}
                />

                <DropdownSeparator />

                <DropdownItem
                  label="Print"
                  shortcut="⌘P"
                  onClick={() => {
                    window.print();
                    setActiveMenu(null);
                  }}
                />

                <DropdownSeparator />

                <DropdownStat label="Words" value={stats.words.toString()} />
                <DropdownStat
                  label="Characters"
                  value={stats.characters.toString()}
                />
              </DropdownMenu>
            )}
          </div>

          <div className="relative">
            <MenuButton
              label="Edit"
              active={activeMenu === "edit"}
              onClick={() =>
                setActiveMenu(activeMenu === "edit" ? null : "edit")
              }
            />

            {activeMenu === "edit" && (
              <DropdownMenu>
                <DropdownItem
                  label="Find and replace"
                  shortcut="⌘F"
                  onClick={() => {
                    setShowFindPanel(true);
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Select all"
                  shortcut="⌘A"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.selectAll().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Copy plain text"
                  shortcut="⌘C"
                  onClick={() => {
                    copyPlainText(editor);
                    setActiveMenu(null);
                  }}
                />

                <DropdownSeparator />

                <DropdownItem
                  label="Clear formatting"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.unsetAllMarks().clearNodes().run(),
                    );
                    setActiveMenu(null);
                  }}
                />
              </DropdownMenu>
            )}
          </div>

          <div className="relative">
            <MenuButton
              label="View"
              active={activeMenu === "view"}
              onClick={() =>
                setActiveMenu(activeMenu === "view" ? null : "view")
              }
            />

            {activeMenu === "view" && (
              <DropdownMenu>
                <DropdownItem
                  label={showRuler ? "Hide ruler" : "Show ruler"}
                  checked={showRuler}
                  onClick={() => setShowRuler((current) => !current)}
                />

                <DropdownItem
                  label={
                    showOutline
                      ? "Hide document outline"
                      : "Show document outline"
                  }
                  checked={showOutline}
                  onClick={() => setShowOutline((current) => !current)}
                />

                <DropdownItem
                  label={
                    printLayout
                      ? "Switch to compact layout"
                      : "Show print layout"
                  }
                  checked={printLayout}
                  onClick={() => setPrintLayout((current) => !current)}
                />

                <DropdownSeparator />

                <DropdownStat label="Zoom" value={`${zoom}%`} />
              </DropdownMenu>
            )}
          </div>

          <div className="relative">
            <MenuButton
              label="Insert"
              active={activeMenu === "insert"}
              onClick={() =>
                setActiveMenu(activeMenu === "insert" ? null : "insert")
              }
            />

            {activeMenu === "insert" && (
              <DropdownMenu>
                <DropdownItem
                  label="Image by URL"
                  disabled={!canEdit}
                  onClick={() => {
                    insertImageByUrl(editor);
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Link"
                  disabled={!canEdit}
                  shortcut="⌘K"
                  onClick={() => {
                    setLink(editor);
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="3 × 3 table"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain
                        .insertTable({
                          rows: 3,
                          cols: 3,
                          withHeaderRow: true,
                        })
                        .run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownSeparator />

                <DropdownItem
                  label="Horizontal line"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.setHorizontalRule().run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Block quote"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.toggleBlockquote().run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Code block"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.toggleCodeBlock().run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Checklist"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.toggleTaskList().run());
                    setActiveMenu(null);
                  }}
                />
              </DropdownMenu>
            )}
          </div>

          <div className="relative">
            <MenuButton
              label="Format"
              active={activeMenu === "format"}
              onClick={() =>
                setActiveMenu(activeMenu === "format" ? null : "format")
              }
            />

            {activeMenu === "format" && (
              <DropdownMenu>
                <DropdownItem
                  label="Normal text"
                  disabled={!canEdit}
                  onClick={() => {
                    applyBlockFormat(editor, "paragraph");
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Heading 1"
                  disabled={!canEdit}
                  onClick={() => {
                    applyBlockFormat(editor, "h1");
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Heading 2"
                  disabled={!canEdit}
                  onClick={() => {
                    applyBlockFormat(editor, "h2");
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Heading 3"
                  disabled={!canEdit}
                  onClick={() => {
                    applyBlockFormat(editor, "h3");
                    setActiveMenu(null);
                  }}
                />

                <DropdownSeparator />

                <DropdownItem
                  label="Bold"
                  checked={isBold}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.toggleBold().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Italic"
                  checked={isItalic}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.toggleItalic().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Underline"
                  checked={isUnderline}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.toggleUnderline().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Strikethrough"
                  checked={isStrike}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.toggleStrike().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Subscript"
                  checked={isSubscript}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.toggleSubscript().run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Superscript"
                  checked={isSuperscript}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.toggleSuperscript().run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownSeparator />

                <DropdownItem
                  label="Align left"
                  checked={isLeft}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.setTextAlign("left").run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Align center"
                  checked={isCenter}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.setTextAlign("center").run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Align right"
                  checked={isRight}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.setTextAlign("right").run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Justify"
                  checked={isJustify}
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.setTextAlign("justify").run(),
                    );
                    setActiveMenu(null);
                  }}
                />
              </DropdownMenu>
            )}
          </div>

          <div className="relative">
            <MenuButton
              label="Table"
              active={activeMenu === "table"}
              onClick={() =>
                setActiveMenu(activeMenu === "table" ? null : "table")
              }
            />

            {activeMenu === "table" && (
              <DropdownMenu>
                <DropdownItem
                  label="Insert 3 × 3 table"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain
                        .insertTable({
                          rows: 3,
                          cols: 3,
                          withHeaderRow: true,
                        })
                        .run(),
                    );
                    setActiveMenu(null);
                  }}
                />

                <DropdownSeparator />

                <DropdownItem
                  label="Add row below"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.addRowAfter().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Add row above"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.addRowBefore().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Add column right"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.addColumnAfter().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Add column left"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.addColumnBefore().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownSeparator />

                <DropdownItem
                  label="Delete row"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.deleteRow().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Delete column"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.deleteColumn().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Delete table"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.deleteTable().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownSeparator />

                <DropdownItem
                  label="Merge cells"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.mergeCells().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Split cell"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) => chain.splitCell().run());
                    setActiveMenu(null);
                  }}
                />

                <DropdownItem
                  label="Toggle header row"
                  disabled={!canEdit}
                  onClick={() => {
                    runCommand(editor, (chain) =>
                      chain.toggleHeaderRow().run(),
                    );
                    setActiveMenu(null);
                  }}
                />
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#dedbd3] bg-[#ebe9e4]/90 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton
              label="↶"
              title="Undo"
              active={false}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.undo().run())
              }
            />

            <ToolbarButton
              label="↷"
              title="Redo"
              active={false}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.redo().run())
              }
            />

            <ToolbarButton
              label="Print"
              title="Print"
              active={false}
              disabled={false}
              onClick={() => window.print()}
            />

            <ToolbarButton
              label="Find"
              title="Find and replace"
              active={showFindPanel}
              disabled={false}
              onClick={() => setShowFindPanel((current) => !current)}
            />

            <ToolbarButton
              label={
                comments.threads.length > 0
                  ? `Comments (${comments.threads.length})`
                  : "Comments"
              }
              title="Show document comments"
              active={comments.isPanelOpen}
              disabled={false}
              onClick={() =>
                comments.setIsPanelOpen((current) => !current)
              }
            />

            <ToolbarDivider />

            <ToolbarSelect
              value={zoom}
              disabled={false}
              onChange={setZoom}
              options={["75", "90", "100", "125", "150"].map((value) => ({
                value,
                label: `${value}%`,
              }))}
              className="w-[88px]"
            />

            <ToolbarSelect
              value={blockFormat}
              disabled={!canEdit}
              onChange={(value) => applyBlockFormat(editor, value)}
              options={[
                { value: "paragraph", label: "Normal text" },
                { value: "h1", label: "Heading 1" },
                { value: "h2", label: "Heading 2" },
                { value: "h3", label: "Heading 3" },
                { value: "blockquote", label: "Quote" },
                { value: "codeBlock", label: "Code block" },
              ]}
              className="w-[150px]"
            />

            <ToolbarSelect
              value={fontFamily}
              disabled={!canEdit}
              onChange={(value) =>
                runCommand(editor, (chain) => chain.setFontFamily(value).run())
              }
              options={FONT_FAMILIES}
              className="w-[145px]"
            />

            <ToolbarButton
              label="−"
              active={false}
              disabled={!canEdit}
              onClick={() => {
                const current = Number(fontSize);
                const next = Math.max(8, current - 1);

                runCommand(editor, (chain) =>
                  chain.setFontSize(`${next}px`).run(),
                );
              }}
            />

            <ToolbarSelect
              value={fontSize}
              disabled={!canEdit}
              onChange={(value) =>
                runCommand(editor, (chain) =>
                  chain.setFontSize(`${value}px`).run(),
                )
              }
              options={FONT_SIZES.map((size) => ({
                value: size,
                label: size,
              }))}
              className="w-[74px]"
            />

            <ToolbarButton
              label="+"
              active={false}
              disabled={!canEdit}
              onClick={() => {
                const current = Number(fontSize);
                const next = Math.min(48, current + 1);

                runCommand(editor, (chain) =>
                  chain.setFontSize(`${next}px`).run(),
                );
              }}
            />

            <ToolbarSelect
              value={lineHeight}
              disabled={!canEdit}
              onChange={(value) =>
                runCommand(editor, (chain) => chain.setLineHeight(value).run())
              }
              options={LINE_HEIGHTS.map((height) => ({
                value: height,
                label: `${height}×`,
              }))}
              className="w-[82px]"
            />

            <ToolbarDivider />

            <ToolbarButton
              label="B"
              title="Bold"
              active={isBold}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.toggleBold().run())
              }
            />

            <ToolbarButton
              label="I"
              title="Italic"
              active={isItalic}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.toggleItalic().run())
              }
            />

            <ToolbarButton
              label="U"
              title="Underline"
              active={isUnderline}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.toggleUnderline().run())
              }
            />

            <ToolbarButton
              label="S"
              title="Strikethrough"
              active={isStrike}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.toggleStrike().run())
              }
            />

            <ToolbarButton
              label="x₂"
              title="Subscript"
              active={isSubscript}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.toggleSubscript().run())
              }
            />

            <ToolbarButton
              label="x²"
              title="Superscript"
              active={isSuperscript}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.toggleSuperscript().run())
              }
            />

            <label className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-[#1d1d1f] transition hover:bg-white/80">
              A
              <input
                type="color"
                disabled={!canEdit}
                className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed"
                onChange={(event) =>
                  runCommand(editor, (chain) =>
                    chain.setColor(event.target.value).run(),
                  )
                }
              />
            </label>

            <label className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-[#1d1d1f] transition hover:bg-white/80">
              Fill
              <input
                type="color"
                disabled={!canEdit}
                defaultValue="#fff3a3"
                className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed"
                onChange={(event) =>
                  runCommand(editor, (chain) =>
                    chain.setBackgroundColor(event.target.value).run(),
                  )
                }
              />
            </label>

            <ToolbarDivider />

            <ToolbarButton
              label="Link"
              title="Add link"
              active={isLink}
              disabled={!canEdit}
              onClick={() => setLink(editor)}
            />

            <ToolbarButton
              label="Image"
              title="Insert image by URL"
              active={false}
              disabled={!canEdit}
              onClick={() => insertImageByUrl(editor)}
            />

            <ToolbarDivider />

            <ToolbarButton
              label="Left"
              active={isLeft}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.setTextAlign("left").run())
              }
            />

            <ToolbarButton
              label="Center"
              active={isCenter}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) =>
                  chain.setTextAlign("center").run(),
                )
              }
            />

            <ToolbarButton
              label="Right"
              active={isRight}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) =>
                  chain.setTextAlign("right").run(),
                )
              }
            />

            <ToolbarButton
              label="Justify"
              active={isJustify}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) =>
                  chain.setTextAlign("justify").run(),
                )
              }
            />

            <ToolbarDivider />

            <ToolbarButton
              label="Bullets"
              active={isBulletList}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.toggleBulletList().run())
              }
            />

            <ToolbarButton
              label="Numbered"
              active={isOrderedList}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.toggleOrderedList().run())
              }
            />

            <ToolbarButton
              label="Checklist"
              active={isTaskList}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) => chain.toggleTaskList().run())
              }
            />

            <ToolbarDivider />

            <ToolbarButton
              label="Table"
              active={false}
              disabled={!canEdit}
              onClick={() =>
                runCommand(editor, (chain) =>
                  chain
                    .insertTable({
                      rows: 3,
                      cols: 3,
                      withHeaderRow: true,
                    })
                    .run(),
                )
              }
            />
          </div>
        </div>

        {showFindPanel && (
          <div className="mt-3 rounded-[1.35rem] border border-[#dedbd3] bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  value={findQuery}
                  onChange={(event) => {
                    setFindQuery(event.target.value);
                    setCurrentMatchIndex(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || findMatches.length === 0) {
                      return;
                    }

                    const next = (safeCurrentMatchIndex + 1) % findMatches.length;

                    setCurrentMatchIndex(next);
                    selectFindMatch(editor, findMatches[next]);
                  }}
                  className="min-h-10 min-w-0 flex-1 rounded-full border border-[#dedbd3] px-4 text-sm outline-none focus:border-[#1d1d1f]"
                  placeholder="Find"
                />

                <input
                  value={replaceText}
                  onChange={(event) => setReplaceText(event.target.value)}
                  className="min-h-10 min-w-0 flex-1 rounded-full border border-[#dedbd3] px-4 text-sm outline-none focus:border-[#1d1d1f]"
                  placeholder="Replace"
                  disabled={!canEdit}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#6e6e73]">
                  {findMatches.length > 0
                    ? `${safeCurrentMatchIndex + 1} of ${findMatches.length}`
                    : "No matches"}
                </span>

                <SmallButton
                  onClick={() => {
                    if (findMatches.length === 0) {
                      return;
                    }

                    const next =
                      (safeCurrentMatchIndex - 1 + findMatches.length) %
                      findMatches.length;

                    setCurrentMatchIndex(next);
                    selectFindMatch(editor, findMatches[next]);
                  }}
                >
                  Previous
                </SmallButton>

                <SmallButton
                  onClick={() => {
                    if (findMatches.length === 0) {
                      return;
                    }

                    const next = (safeCurrentMatchIndex + 1) % findMatches.length;

                    setCurrentMatchIndex(next);
                    selectFindMatch(editor, findMatches[next]);
                  }}
                >
                  Next
                </SmallButton>

                <SmallButton
                  disabled={!canEdit || !currentFindMatch}
                  onClick={() => {
                    replaceFindMatch(editor, currentFindMatch, replaceText);
                    setCurrentMatchIndex(0);
                  }}
                >
                  Replace
                </SmallButton>

                <button
                  type="button"
                  disabled={!canEdit || findMatches.length === 0}
                  className="rounded-full bg-[#1d1d1f] px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => {
                    replaceAllMatches(editor, findMatches, replaceText);
                    setCurrentMatchIndex(0);
                  }}
                >
                  Replace all
                </button>

                <SmallButton onClick={() => setShowFindPanel(false)}>
                  Close
                </SmallButton>
              </div>
            </div>
          </div>
        )}

        {showRuler && (
          <div className="mt-3 px-2">
            <div className="mx-auto flex max-w-[1110px] items-end">
              <div className="h-6 w-[80px]" />

              <div className="relative flex h-6 flex-1 items-end rounded-t-xl border border-b-0 border-[#dedbd3] bg-[#fbfaf7] px-5">
                <div className="flex w-full items-end justify-between text-[10px] text-[#86868b]">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center gap-1"
                    >
                      <span>{index + 1}</span>
                      <span className="h-2 w-px bg-[#c7c7cc]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-6 w-[80px]" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#f5f4f1] px-2 pb-12 pt-6 md:px-6">
        <div className="mx-auto flex max-w-[1780px] flex-col gap-6 xl:flex-row xl:gap-8">
          {showOutline && !comments.isPanelOpen && (
            <aside className="hidden w-[260px] shrink-0 px-3 py-3 xl:block">
              <div className="space-y-5 rounded-3xl bg-transparent px-2">
                <div>
                  <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    Document outline
                  </h3>

                  {outlineItems.length === 0 ? (
                    <p className="mt-3 px-1 text-[0.95rem] italic leading-7 text-[#6e6e73]">
                      Headings you add to the document will appear here.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-1">
                      {outlineItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => jumpToPosition(editor, item.pos)}
                          className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-[#1d1d1f] transition hover:bg-white"
                          style={{
                            paddingLeft: `${item.level * 12}px`,
                          }}
                        >
                          <span className="block truncate">{item.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[1.4rem] border border-[#dedbd3] bg-white/80 p-4 text-sm text-[#6e6e73] shadow-sm">
                  <p className="font-medium text-[#1d1d1f]">Status</p>

                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <ConnectionIndicator status={connectionStatus} />
                      <span>{connectionLabel(connectionStatus)}</span>
                    </div>

                    <p>
                      {syncStatus === "synced"
                        ? "All changes saved"
                        : "Saving..."}
                    </p>

                    <p>
                      {stats.words} {stats.words === 1 ? "word" : "words"} ·{" "}
                      {stats.characters}{" "}
                      {stats.characters === 1 ? "character" : "characters"}
                    </p>
                  </div>
                </div>

                {onlineUsers.length > 0 && (
                  <div className="rounded-[1.4rem] border border-[#dedbd3] bg-white/80 p-4 text-sm shadow-sm">
                    <p className="font-medium text-[#1d1d1f]">
                      Active collaborators
                    </p>

                    <div className="mt-3 flex flex-col gap-2">
                      {onlineUsers.map((user) => (
                        <div
                          key={user.key}
                          className="flex items-center gap-2 rounded-2xl bg-[#f5f4f1] px-3 py-2 text-[#1d1d1f]"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: user.color }}
                          />
                          <span className="truncate">{user.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          <div className="min-w-0 flex-1">
            {!canEdit && (
              <div className="mx-auto mb-4 max-w-[1110px] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You have viewer access. This document is read-only.
              </div>
            )}

            {hasSelection && canEdit && (
              <div className="mx-auto mb-3 flex max-w-[1110px] flex-wrap items-center gap-2 rounded-[1.4rem] border border-[#dedbd3] bg-white/90 px-3 py-2 shadow-sm">
                <span className="mr-2 text-sm text-[#6e6e73]">
                  Selection
                </span>

                <SmallButton
                  onClick={() =>
                    runCommand(editor, (chain) => chain.toggleBold().run())
                  }
                >
                  Bold
                </SmallButton>

                <SmallButton
                  onClick={() =>
                    runCommand(editor, (chain) => chain.toggleItalic().run())
                  }
                >
                  Italic
                </SmallButton>

                <SmallButton onClick={() => setLink(editor)}>Link</SmallButton>

                <SmallButton
                  onClick={() =>
                    runCommand(editor, (chain) =>
                      chain.setBackgroundColor("#fff3a3").run(),
                    )
                  }
                >
                  Highlight
                </SmallButton>

                <SmallButton onClick={commentEditor.startComment}>
                  Add comment
                </SmallButton>
              </div>
            )}

            <div
              className={`mx-auto bg-white transition-shadow ${
                printLayout
                  ? "max-w-[1110px] rounded-sm border border-[#dedbd3] shadow-[0_12px_48px_rgba(0,0,0,0.10)]"
                  : "max-w-[1200px] rounded-[2rem] border border-[#dedbd3] shadow-sm"
              }`}
              style={{
                transform: `scale(${Number(zoom) / 100})`,
                transformOrigin: "top center",
              }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>

          {comments.isPanelOpen && (
            <CommentsSidebar
              threads={comments.threads}
              activeThreadId={comments.activeThreadId}
              anchoredThreadIds={commentEditor.anchoredThreadIds}
              pendingComment={commentEditor.pendingComment}
              canComment={canEdit}
              isLoading={comments.isLoading}
              loadError={comments.loadError}
              mutationError={comments.mutationError}
              mutation={comments.mutation}
              showResolvedComments={comments.showResolvedComments}
              onClose={() => comments.setIsPanelOpen(false)}
              onRefresh={comments.refreshComments}
              onCancelCreate={commentEditor.cancelPendingComment}
              onCreate={commentEditor.createPendingComment}
              onSelectThread={commentEditor.selectCommentThread}
              onReply={comments.replyToThread}
              onChangeStatus={comments.changeThreadStatus}
              onShowResolvedComments={comments.setShowResolvedComments}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function MenuButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active
          ? "bg-white text-[#1d1d1f] shadow-sm"
          : "text-[#1d1d1f] hover:bg-white/70"
      }`}
    >
      {label}
    </button>
  );
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 top-9 z-50 w-[340px] rounded-[1.2rem] border border-[#dedbd3] bg-white py-2 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      {children}
    </div>
  );
}

function DropdownItem({
  label,
  shortcut,
  checked = false,
  disabled = false,
  onClick,
}: {
  label: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm text-[#1d1d1f] transition hover:bg-[#f5f4f1] disabled:cursor-not-allowed disabled:text-[#b8b9ba]"
    >
      <span className="flex items-center gap-3">
        <span className="w-4 text-center text-[#6e6e73]">
          {checked ? "✓" : ""}
        </span>
        <span>{label}</span>
      </span>

      {shortcut && <span className="text-[#86868b]">{shortcut}</span>}
    </button>
  );
}

function DropdownSeparator() {
  return <div className="my-2 h-px bg-[#e5e1d8]" />;
}

function DropdownStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm">
      <span className="text-[#6e6e73]">{label}</span>
      <span className="font-medium text-[#1d1d1f]">{value}</span>
    </div>
  );
}

function ToolbarButton({
  label,
  title,
  active,
  disabled,
  onClick,
}: {
  label: string;
  title?: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={`h-10 rounded-full px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "bg-[#1d1d1f] text-white"
          : "text-[#1d1d1f] hover:bg-white/80"
      }`}
    >
      {label}
    </button>
  );
}

function ToolbarSelect({
  value,
  disabled,
  options,
  onChange,
  className = "",
}: {
  value: string;
  disabled: boolean;
  options: Array<{
    value: string;
    label: string;
  }>;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={`h-10 rounded-full border border-transparent bg-transparent px-3 text-sm font-medium text-[#1d1d1f] outline-none transition hover:bg-white/80 focus:border-[#dedbd3] focus:bg-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SmallButton({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded-full border border-[#dedbd3] bg-white px-4 py-2 text-sm font-medium text-[#1d1d1f] transition hover:bg-[#f5f4f1] disabled:cursor-not-allowed disabled:opacity-40"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-[#d0cec7]" />;
}

function ConnectionIndicator({ status }: { status: string }) {
  const color =
    status === "connected"
      ? "bg-green-500"
      : status === "connecting"
        ? "bg-yellow-500"
        : "bg-red-500";

  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />;
}

function connectionLabel(status: string) {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting...";
    case "disconnected":
      return "Disconnected";
    default:
      return status;
  }
}
