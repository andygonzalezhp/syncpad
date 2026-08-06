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
    <header className="relative z-40 border-b border-black/[0.06] bg-[#fbfbf9]/90 backdrop-blur-2xl">
      <div className="mx-auto max-w-[1800px] px-3 py-3 sm:px-5 lg:px-7">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg text-[#5f5f5a] transition duration-200 hover:bg-black/[0.05] hover:text-[#20201e]"
              aria-label="Back to documents"
              title="Back to documents"
            >
              ←
            </Link>

            <div className="min-w-0 flex-1">
              <form onSubmit={handleRename} className="flex min-w-0 flex-col">
                <div className="flex min-w-0 items-center gap-2">
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
                    className="min-w-0 w-full max-w-[720px] rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-[1.15rem] font-semibold leading-tight tracking-[-0.025em] text-[#20201e] outline-none transition duration-200 hover:bg-black/[0.025] focus:border-black/[0.08] focus:bg-white read-only:cursor-default sm:text-[1.3rem]"
                    placeholder="Untitled document"
                  />

                  {canRename && hasUnsavedTitle && (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="shrink-0 rounded-lg bg-[#20201e] px-3 py-1.5 text-xs font-semibold text-white transition duration-200 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save title"}
                    </button>
                  )}
                </div>

                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-1.5 text-xs text-[#777771]">
                  <span className="font-medium text-[#555550]">
                    SyncPad
                  </span>

                  <span aria-hidden="true" className="text-[#c1c1bb]">/</span>

                  <span className="font-medium text-[#777771]">
                    {roleLabel}
                  </span>

                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#c1c1bb]" />

                  <span aria-live="polite" className="truncate">
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
                    className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200"
                  >
                    <span>Save the title, or discard it before leaving.</span>
                    <Link
                      href="/"
                      className="rounded-lg bg-amber-950 px-3 py-1.5 font-semibold text-white"
                    >
                      Discard and leave
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeaveWarning(false);
                        document.getElementById("document-title")?.focus();
                      }}
                      className="rounded-lg px-3 py-1.5 font-semibold transition hover:bg-amber-100"
                    >
                      Keep editing
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {canOpenShare && (
              <a
                href="#sharing-panel"
                className="rounded-xl bg-[#20201e] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20201e]"
              >
                Share
              </a>
            )}

            <div className="rounded-full bg-white p-0.5 shadow-[0_1px_2px_rgba(20,20,18,0.08)] ring-1 ring-black/[0.08]">
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
