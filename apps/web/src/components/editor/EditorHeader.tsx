"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { UserButton } from "@clerk/nextjs";
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
  const { renameDocument } = useSyncPadApi();

  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canRename = currentUserRole === "OWNER";
  const canOpenShare = currentUserRole === "OWNER";
  const hasUnsavedTitle = title.trim() !== savedTitle;

  const roleLabel = useMemo(() => {
    if (currentUserRole === "OWNER") {
      return "Owner";
    }

    if (currentUserRole === "EDITOR") {
      return "Editor";
    }

    return "Viewer";
  }, [currentUserRole]);

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
      setMessage("All changes saved");
    } catch {
      setMessage("Could not save title");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <header className="border-b border-[#dedbd3] bg-[#fbfaf7]/95 backdrop-blur-xl">
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <Link
              href="/"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-neutral-950 text-xl text-white shadow-sm transition hover:bg-neutral-800"
              aria-label="Back to documents"
              title="Back to documents"
            >
              ◻
            </Link>

            <div className="min-w-0 flex-1">
              <form
                onSubmit={handleRename}
                className="flex min-w-0 flex-col gap-2"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <input
                    value={title}
                    readOnly={!canRename}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setMessage(null);
                    }}
                    className="min-w-0 max-w-full rounded-xl border border-transparent bg-transparent px-2 py-1 text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-[#1d1d1f] outline-none transition focus:border-[#d2d2d7] focus:bg-white read-only:cursor-default"
                    placeholder="Untitled document"
                  />

                  {canRename && hasUnsavedTitle && (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-full bg-[#1d1d1f] px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save title"}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-[#6e6e73]">
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-[#1d1d1f] ring-1 ring-[#dedbd3]">
                    SyncPad
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 font-medium text-[#1d1d1f] ring-1 ring-[#dedbd3]">
                    {roleLabel}
                  </span>

                  <span>•</span>

                  <span>
                    {message ??
                      (hasUnsavedTitle
                        ? "Unsaved title changes"
                        : "All changes saved")}
                  </span>

                  <span>•</span>

                  <span className="font-mono text-xs text-[#86868b]">
                    {docId}
                  </span>
                </div>
              </form>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {canOpenShare && (
              <a
                href="#sharing-panel"
                className="rounded-full bg-[#c7e7ff] px-5 py-3 text-sm font-semibold text-[#0b3d62] transition hover:bg-[#b7def8]"
              >
                Share
              </a>
            )}

            <div className="rounded-full bg-white p-1 shadow-sm ring-1 ring-[#dedbd3]">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}