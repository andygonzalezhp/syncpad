"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { DocumentPermission, DocumentRole } from "@/lib/api";
import { useSyncPadApi } from "@/lib/useSyncPadApi";

type SharePanelProps = {
  documentId: string;
  currentUserRole: DocumentRole;
};

type ShareFeedback = {
  kind: "success" | "error";
  message: string;
};

function displayRole(role: DocumentRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function SharePanel({
  documentId,
  currentUserRole,
}: SharePanelProps) {
  const {
    isAuthReady,
    listDocumentPermissions,
    removeDocumentPermission,
    shareDocument,
  } = useSyncPadApi();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<DocumentRole, "OWNER">>("EDITOR");
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [permissionsDocumentId, setPermissionsDocumentId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(currentUserRole === "OWNER");
  const [isSharing, setIsSharing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ShareFeedback | null>(null);
  const [confirmingPermissionId, setConfirmingPermissionId] = useState<
    string | null
  >(null);
  const [removingPermissionIds, setRemovingPermissionIds] = useState<
    Set<string>
  >(new Set());

  const permissionsRequestSequence = useRef(0);
  const sharingLock = useRef(false);
  const removalLocks = useRef(new Set<string>());
  const emailInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);

  const isOwner = currentUserRole === "OWNER";
  const displayedPermissions =
    permissionsDocumentId === documentId ? permissions : [];
  const ownerPermission = displayedPermissions.find(
    (permission) => permission.role === "OWNER",
  );
  const collaborators = displayedPermissions.filter(
    (permission) => permission.role !== "OWNER",
  );
  const permissionsReady =
    permissionsDocumentId === documentId && !isLoading && !loadError;
  const roleDescription =
    role === "EDITOR"
      ? "Editors can change the document and participate in comments."
      : "Viewers can read the document and comments, but cannot make changes.";

  async function loadPermissions(requestId = ++permissionsRequestSequence.current) {
    if (!isOwner || !isAuthReady) {
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);

      const data = await listDocumentPermissions(documentId);

      if (requestId !== permissionsRequestSequence.current) {
        return;
      }

      setPermissions(data);
      setPermissionsDocumentId(documentId);
    } catch {
      if (requestId === permissionsRequestSequence.current) {
        setPermissions([]);
        setPermissionsDocumentId(documentId);
        setLoadError("Couldn’t load the people who have access. Try again.");
      }
    } finally {
      if (requestId === permissionsRequestSequence.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    const requestId = ++permissionsRequestSequence.current;
    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
      setConfirmingPermissionId(null);
      void loadPermissions(requestId);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);

      if (permissionsRequestSequence.current === requestId) {
        permissionsRequestSequence.current += 1;
      }
    };
    // The API hook functions intentionally follow the existing app convention.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, isOwner, isAuthReady]);

  useEffect(() => {
    if (!isOwner || !isAuthReady) {
      return;
    }

    let focusFrame: number | null = null;

    function focusShareForm() {
      if (focusFrame !== null) {
        window.cancelAnimationFrame(focusFrame);
      }

      focusFrame = window.requestAnimationFrame(() => {
        focusFrame = null;
        emailInputRef.current?.focus();
      });
    }

    function handleHashChange() {
      if (window.location.hash === "#sharing-panel") {
        focusShareForm();
      }
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;

      if (
        target instanceof Element &&
        target.closest('a[href="#sharing-panel"]')
      ) {
        focusShareForm();
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    document.addEventListener("click", handleDocumentClick);
    handleHashChange();

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      document.removeEventListener("click", handleDocumentClick);

      if (focusFrame !== null) {
        window.cancelAnimationFrame(focusFrame);
      }
    };
  }, [isAuthReady, isOwner]);

  async function handleShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sharingLock.current || !permissionsReady) {
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setFeedback({ kind: "error", message: "Enter an email address." });
      emailInputRef.current?.focus();
      return;
    }

    const existingPermission = displayedPermissions.find(
      (permission) => permission.userEmail.toLowerCase() === trimmedEmail,
    );

    if (existingPermission?.role === "OWNER") {
      setFeedback({
        kind: "error",
        message: "The document owner’s role cannot be changed.",
      });
      return;
    }

    sharingLock.current = true;

    try {
      setIsSharing(true);
      setFeedback(null);

      const updatedPermission = await shareDocument(
        documentId,
        trimmedEmail,
        role,
      );

      setPermissions((current) => {
        const withoutExisting = current.filter(
          (permission) =>
            permission.id !== updatedPermission.id &&
            permission.userEmail.toLowerCase() !==
              updatedPermission.userEmail.toLowerCase(),
        );

        return [...withoutExisting, updatedPermission];
      });

      setEmail("");
      setFeedback({
        kind: "success",
        message: existingPermission
          ? `Updated ${updatedPermission.userEmail} to ${displayRole(updatedPermission.role)} access.`
          : `Shared this document with ${updatedPermission.userEmail} as ${updatedPermission.role === "EDITOR" ? "an editor" : "a viewer"}.`,
      });
    } catch {
      setFeedback({
        kind: "error",
        message: existingPermission
          ? `Couldn’t update access for ${trimmedEmail}. Try again.`
          : `Couldn’t share this document with ${trimmedEmail}. Check the address and try again.`,
      });
    } finally {
      sharingLock.current = false;
      setIsSharing(false);
    }
  }

  async function handleRemove(permission: DocumentPermission) {
    if (removalLocks.current.has(permission.id)) {
      return;
    }

    removalLocks.current.add(permission.id);
    setRemovingPermissionIds((current) => new Set(current).add(permission.id));
    setFeedback(null);

    try {
      await removeDocumentPermission(documentId, permission.id);

      setPermissions((current) =>
        current.filter(
          (currentPermission) => currentPermission.id !== permission.id,
        ),
      );
      setConfirmingPermissionId(null);
      setFeedback({
        kind: "success",
        message: `Removed access for ${permission.userEmail}.`,
      });
      window.requestAnimationFrame(() => feedbackRef.current?.focus());
    } catch {
      setFeedback({
        kind: "error",
        message: `Couldn’t remove access for ${permission.userEmail}. Try again.`,
      });
    } finally {
      removalLocks.current.delete(permission.id);
      setRemovingPermissionIds((current) => {
        const next = new Set(current);
        next.delete(permission.id);
        return next;
      });
    }
  }

  function cancelRemove(permissionId: string) {
    setConfirmingPermissionId(null);
    window.requestAnimationFrame(() => {
      document.getElementById(`remove-permission-${permissionId}`)?.focus();
    });
  }

  if (!isOwner) {
    return null;
  }

  if (!isAuthReady) {
    return (
      <section
        className="mb-6 rounded-3xl border border-stone-300 bg-white p-5 text-neutral-500 shadow-sm"
        role="status"
        aria-live="polite"
      >
        Loading sharing settings...
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-3xl border border-stone-300 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
            Sharing
          </p>

          <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">
            Invite collaborators
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Choose whether each person can edit and comment or only view this
            document.
          </p>
        </div>

        <div className="text-sm text-stone-500" aria-live="polite">
          {collaborators.length}{" "}
          {collaborators.length === 1 ? "collaborator" : "collaborators"}
        </div>
      </div>

      <form
        onSubmit={handleShare}
        className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[minmax(0,1fr)_220px_140px] md:items-start"
        aria-busy={isSharing}
      >
        <div>
          <label
            htmlFor="share-email"
            className="mb-1.5 block text-sm font-medium text-neutral-800"
          >
            Email address
          </label>
          <input
            ref={emailInputRef}
            id="share-email"
            name="email"
            type="email"
            value={email}
            required
            maxLength={320}
            autoComplete="email"
            disabled={isSharing}
            onChange={(event) => {
              setEmail(event.target.value);
              setFeedback(null);
            }}
            className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 text-neutral-900 outline-none placeholder:text-stone-400 focus:border-neutral-500 disabled:cursor-not-allowed disabled:bg-stone-100"
            placeholder="teammate@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="share-role"
            className="mb-1.5 block text-sm font-medium text-neutral-800"
          >
            Access level
          </label>
          <select
            id="share-role"
            name="role"
            value={role}
            disabled={isSharing}
            aria-describedby="share-role-description"
            onChange={(event) => {
              setRole(
                event.target.value as Exclude<DocumentRole, "OWNER">,
              );
              setFeedback(null);
            }}
            className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 text-neutral-900 outline-none focus:border-neutral-500 disabled:cursor-not-allowed disabled:bg-stone-100"
          >
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <p
            id="share-role-description"
            className="mt-1.5 text-xs leading-5 text-neutral-500"
          >
            {roleDescription}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSharing || !permissionsReady}
          className="min-h-12 rounded-2xl bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:cursor-not-allowed disabled:opacity-60 md:mt-[1.65rem]"
        >
          {isSharing ? "Sharing..." : "Share access"}
        </button>
      </form>

      {feedback && (
        <p
          ref={feedbackRef}
          tabIndex={-1}
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.kind === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <div className="mt-5">
        {isLoading || permissionsDocumentId !== documentId ? (
          <p role="status" aria-live="polite" className="text-sm text-neutral-500">
            Loading people with access...
          </p>
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700"
          >
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void loadPermissions()}
              className="mt-3 rounded-xl bg-white px-3 py-2 font-medium ring-1 ring-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {ownerPermission && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Document owner
                </h3>
                <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {ownerPermission.displayName}
                    </p>
                    <p className="truncate text-sm text-neutral-500">
                      {ownerPermission.userEmail}
                    </p>
                  </div>
                  <span className="self-start rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white sm:self-auto">
                    Owner
                  </span>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Collaborators
              </h3>

              {collaborators.length === 0 ? (
                <div className="mt-2 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-neutral-500">
                  No collaborators yet. Share access above to invite someone.
                </div>
              ) : (
                <div className="mt-2 grid gap-3">
                  {collaborators.map((permission) => {
                    const isRemoving = removingPermissionIds.has(permission.id);
                    const isConfirming =
                      confirmingPermissionId === permission.id;
                    const confirmationLabelId = `remove-confirmation-${permission.id}`;

                    return (
                      <div
                        key={permission.id}
                        className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                        aria-busy={isRemoving}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-neutral-900">
                            {permission.displayName}
                          </p>
                          <p className="truncate text-sm text-neutral-500">
                            {permission.userEmail}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              permission.role === "EDITOR"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {displayRole(permission.role)}
                          </span>

                          {isConfirming ? (
                            <div
                              role="group"
                              aria-labelledby={confirmationLabelId}
                              className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2"
                            >
                              <span
                                id={confirmationLabelId}
                                className="text-sm text-red-800"
                              >
                                Remove access for {permission.userEmail}?
                              </span>
                              <button
                                type="button"
                                autoFocus
                                disabled={isRemoving}
                                onClick={() => cancelRemove(permission.id)}
                                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-neutral-700 ring-1 ring-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isRemoving}
                                onClick={() => void handleRemove(permission)}
                                className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isRemoving ? "Removing..." : "Remove access"}
                              </button>
                            </div>
                          ) : (
                            <button
                              id={`remove-permission-${permission.id}`}
                              type="button"
                              onClick={() =>
                                setConfirmingPermissionId(permission.id)
                              }
                              className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                              aria-label={`Remove access for ${permission.displayName}`}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
