"use client";

import { FormEvent, useEffect, useState } from "react";
import { DocumentPermission, DocumentRole } from "@/lib/api";
import { useSyncPadApi } from "@/lib/useSyncPadApi";

type SharePanelProps = {
  documentId: string;
  currentUserRole: DocumentRole;
};

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
  const [isLoading, setIsLoading] = useState(currentUserRole === "OWNER");
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserRole === "OWNER";

  async function loadPermissions() {
    if (!isOwner || !isAuthReady) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await listDocumentPermissions(documentId);
      setPermissions(data);
    } catch {
      setError("Could not load collaborators.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPermissions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, isOwner, isAuthReady]);

  async function handleShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    try {
      setIsSharing(true);
      setError(null);

      const updatedPermission = await shareDocument(
        documentId,
        trimmedEmail,
        role,
      );

      setPermissions((current) => {
        const withoutExisting = current.filter(
          (permission) => permission.id !== updatedPermission.id,
        );

        return [...withoutExisting, updatedPermission];
      });

      setEmail("");
    } catch {
      setError("Could not share document.");
    } finally {
      setIsSharing(false);
    }
  }

  async function handleRemove(permissionId: string) {
    const confirmed = window.confirm("Remove this collaborator?");

    if (!confirmed) {
      return;
    }

    try {
      setError(null);

      await removeDocumentPermission(documentId, permissionId);

      setPermissions((current) =>
        current.filter((permission) => permission.id !== permissionId),
      );
    } catch {
      setError("Could not remove collaborator.");
    }
  }

  if (!isOwner) {
    return null;
  }

  if (!isAuthReady) {
    return (
      <section className="mb-6 rounded-3xl border border-stone-300 bg-white p-5 text-neutral-500 shadow-sm">
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
            Share this document by email and control whether someone can edit or
            only view.
          </p>
        </div>

        <div className="text-sm text-stone-500">
          {permissions.length}{" "}
          {permissions.length === 1 ? "collaborator" : "collaborators"}
        </div>
      </div>

      <form
        onSubmit={handleShare}
        className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[minmax(0,1fr)_180px_130px]"
      >
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-12 rounded-2xl border border-stone-300 bg-white px-4 text-neutral-900 outline-none placeholder:text-stone-400 focus:border-neutral-500"
          placeholder="teammate@example.com"
        />

        <select
          value={role}
          onChange={(event) =>
            setRole(event.target.value as Exclude<DocumentRole, "OWNER">)
          }
          className="min-h-12 rounded-2xl border border-stone-300 bg-white px-4 text-neutral-900 outline-none focus:border-neutral-500"
        >
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Viewer</option>
        </select>

        <button
          type="submit"
          disabled={isSharing}
          className="min-h-12 rounded-2xl bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSharing ? "Sharing..." : "Share"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading collaborators...</p>
        ) : permissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-neutral-500">
            No collaborators yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
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
                      permission.role === "OWNER"
                        ? "bg-neutral-950 text-white"
                        : permission.role === "EDITOR"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {permission.role}
                  </span>

                  {permission.role !== "OWNER" && (
                    <button
                      type="button"
                      onClick={() => handleRemove(permission.id)}
                      className="rounded-xl border border-red-300 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
