"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { DocumentRole } from "@/lib/api";
import { useSyncPadApi } from "@/lib/useSyncPadApi";

type EditorHeaderProps = {
  docId: string;
  initialTitle: string;
  currentUserRole: DocumentRole;
};

export default function EditorHeader({
  docId,
  initialTitle,
  currentUserRole,
}: EditorHeaderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { renameDocument } = useSyncPadApi();

  const canRename = currentUserRole === "OWNER";
  const hasUnsavedTitle = title.trim() !== savedTitle;

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canRename) {
      setMessage("Only the owner can rename this document.");
      return;
    }

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setMessage("Title cannot be empty.");
      return;
    }

    if (trimmedTitle === savedTitle) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);

      const updatedDocument = await renameDocument(docId, trimmedTitle);

      setTitle(updatedDocument.title);
      setSavedTitle(updatedDocument.title);
      setMessage("Title saved.");
    } catch {
      setMessage("Could not rename document.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <header className="mb-6">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-neutral-500 transition hover:text-neutral-200"
        >
          ← Back to documents
        </Link>
      </div>

      <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
        SyncPad
      </p>

      <form
        onSubmit={handleRename}
        className="mt-2 flex flex-col gap-3 md:flex-row"
      >
        <input
          value={title}
          readOnly={!canRename}
          onChange={(event) => {
            setTitle(event.target.value);
            setMessage(null);
          }}
          className="min-h-12 flex-1 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-2xl font-semibold tracking-tight text-neutral-100 outline-none transition focus:border-neutral-500 read-only:cursor-default read-only:text-neutral-300 md:text-3xl"
          placeholder="Untitled document"
        />

        {canRename && (
          <button
            type="submit"
            disabled={isSaving || !hasUnsavedTitle}
            className="min-h-12 rounded-2xl bg-white px-5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save title"}
          </button>
        )}
      </form>

      <div className="mt-3 flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
        <p className="text-neutral-400">
          Document ID:{" "}
          <span className="rounded bg-neutral-900 px-2 py-1 font-mono text-neutral-200">
            {docId}
          </span>
        </p>

        <p className="text-neutral-500">
          Your role:{" "}
          <span className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-300">
            {currentUserRole}
          </span>
        </p>

        {message && (
          <p
            className={
              message === "Title saved." ? "text-green-400" : "text-red-300"
            }
          >
            {message}
          </p>
        )}
      </div>
    </header>
  );
}