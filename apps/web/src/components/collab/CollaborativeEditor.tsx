"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import {
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
  useHocuspocusSyncStatus,
} from "@hocuspocus/provider-react";
import { DocumentRole } from "@/lib/api";

type CurrentUser = {
  email: string;
  name: string;
  color: string;
  role: DocumentRole;
};

type CollaborativeEditorProps = {
  currentUser: CurrentUser;
  currentUserRole: DocumentRole;
};

type AwarenessState = {
  clientId: number;
  name?: string;
  color?: string;
  user?: {
    name?: string;
    color?: string;
    email?: string;
    role?: DocumentRole;
  };
};

function getAwarenessUser(state: AwarenessState) {
  return {
    name: state.user?.name ?? state.name ?? "Guest",
    color: state.user?.color ?? state.color ?? "#737373",
    role: state.user?.role,
  };
}

export default function CollaborativeEditor({
  currentUser,
  currentUserRole,
}: CollaborativeEditorProps) {
  const provider = useHocuspocusProvider();
  const awareness = useHocuspocusAwareness() as AwarenessState[];
  const connectionStatus = useHocuspocusConnectionStatus();
  const syncStatus = useHocuspocusSyncStatus();

  const canEdit = currentUserRole === "OWNER" || currentUserRole === "EDITOR";

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: canEdit,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
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
            "prose prose-invert max-w-none min-h-[500px] rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-5 text-neutral-100 outline-none",
        },
      },
    },
    [
      provider,
      currentUser.email,
      currentUser.name,
      currentUser.color,
      currentUserRole,
      canEdit,
    ],
  );

  const collaborators = awareness.map((state) => ({
    clientId: state.clientId,
    ...getAwarenessUser(state),
  }));

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-4 shadow-2xl">
      <div className="mb-4 flex flex-col gap-4 border-b border-neutral-800 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
            />

            <span className="text-neutral-300">
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
            </span>

            <span className="text-neutral-600">/</span>

            <span className="text-neutral-400">
              {syncStatus === "synced" ? "All changes synced" : "Syncing..."}
            </span>
          </div>

          <p className="mt-1 text-xs text-neutral-500">
            You are{" "}
            <span style={{ color: currentUser.color }}>{currentUser.name}</span>{" "}
            <span className="text-neutral-600">({currentUserRole})</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {collaborators.map((user) => (
            <div
              key={user.clientId}
              title={`${user.name}${user.role ? ` (${user.role})` : ""}`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-neutral-900"
              style={{ backgroundColor: user.color }}
            >
              {user.name[0]?.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {!canEdit && (
        <div className="mb-4 rounded-2xl border border-yellow-900/70 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-100">
          You have viewer access. This document is read-only.
        </div>
      )}

      {canEdit && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            Bold
          </button>

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            Italic
          </button>

          <button
            type="button"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            Heading
          </button>

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            Bullet List
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </section>
  );
}