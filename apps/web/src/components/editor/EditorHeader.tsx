"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const titleRef = useRef(initialTitle);
  const renameInFlight = useRef(false);
  const leaveWarningRef = useRef<HTMLDivElement>(null);

  const canRename = currentUserRole === "OWNER";
  const canOpenShare = currentUserRole === "OWNER";
  const hasUnsavedTitle = title.trim() !== savedTitle;

  useEffect(() => {
    if (!hasUnsavedTitle) {
      return;
    }

    function warnAboutUnsavedTitle(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnAboutUnsavedTitle);

    return () => window.removeEventListener("beforeunload", warnAboutUnsavedTitle);
  }, [hasUnsavedTitle]);

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

    if (renameInFlight.current || isSaving) {
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

    renameInFlight.current = true;

    try {
      setIsSaving(true);
      setMessage(null);

      const submittedTitle = trimmedTitle;
      const updatedDocument = await renameDocument(docId, submittedTitle);
      const hasNewerTitleChanges =
        titleRef.current.trim() !== submittedTitle;

      setSavedTitle(updatedDocument.title);
      if (!hasNewerTitleChanges) {
        titleRef.current = updatedDocument.title;
        setTitle(updatedDocument.title);
        setShowLeaveWarning(false);
      }
      setMessage(
        hasNewerTitleChanges
          ? "Previous title saved. New title changes are not saved yet."
          : "Title saved",
      );
    } catch {
      setMessage("Could not save title. Try again.");
    } finally {
      renameInFlight.current = false;
      setIsSaving(false);
    }
  }

  return (
    <header className="border-b border-[#dedbd3] bg-[#fbfaf7]/95 backdrop-blur-xl">
      <div className="px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <Link
              href="/"
              onClick={(event) => {
                if (hasUnsavedTitle) {
                  event.preventDefault();
                  setShowLeaveWarning(true);
                  window.requestAnimationFrame(() => {
                    leaveWarningRef.current?.focus();
                  });
                }
              }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-neutral-950 text-xl text-white shadow-sm transition hover:bg-neutral-800"
              aria-label="Back to documents"
              title="Back to documents"
            >
              ←
            </Link>

            <div className="min-w-0 flex-1">
              <form
                onSubmit={handleRename}
                className="flex min-w-0 flex-col gap-2"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <input
                    id="document-title"
                    aria-label="Document title"
                    value={title}
                    maxLength={255}
                    readOnly={!canRename}
                    onChange={(event) => {
                      titleRef.current = event.target.value;
                      setTitle(event.target.value);
                      setMessage(null);
                      setShowLeaveWarning(false);
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

                  <span aria-live="polite">
                    {message ??
                      (hasUnsavedTitle
                        ? "Unsaved title changes"
                        : "Title saved")}
                  </span>
                </div>

                {showLeaveWarning && hasUnsavedTitle && (
                  <div
                    ref={leaveWarningRef}
                    tabIndex={-1}
                    role="alert"
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                  >
                    <span>Save the title, or discard it before leaving.</span>
                    <Link
                      href="/"
                      className="rounded-full bg-amber-950 px-3 py-1.5 font-semibold text-white"
                    >
                      Discard and leave
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeaveWarning(false);
                        document.getElementById("document-title")?.focus();
                      }}
                      className="rounded-full px-3 py-1.5 font-semibold hover:bg-amber-100"
                    >
                      Keep editing
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center justify-end gap-3 sm:w-auto">
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
