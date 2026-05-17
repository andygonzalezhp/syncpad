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
    loadPermissions();
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
      <section className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-4 text-neutral-300 shadow-2xl">
        Loading sharing settings...
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-4 shadow-2xl">
      <div className="mb-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.25em] text-neutral-500">
          Sharing
        </h2>

        <p className="mt-2 text-sm text-neutral-400">
          Invite collaborators by email and assign document access.
        </p>
      </div>

      <form onSubmit={handleShare} className="flex flex-col gap-3 md:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-12 flex-1 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-400"
          placeholder="teammate@example.com"
        />

        <select
          value={role}
          onChange={(event) =>
            setRole(event.target.value as Exclude<DocumentRole, "OWNER">)
          }
          className="min-h-12 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 text-neutral-100 outline-none focus:border-neutral-400"
        >
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Viewer</option>
        </select>

        <button
          type="submit"
          disabled={isSharing}
          className="min-h-12 rounded-2xl bg-white px-5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSharing ? "Sharing..." : "Share"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-medium text-neutral-300">
          Collaborators
        </h3>

        {isLoading ? (
          <p className="mt-3 text-sm text-neutral-500">
            Loading collaborators...
          </p>
        ) : permissions.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No collaborators yet.
          </p>
        ) : (
          <div className="mt-3 grid gap-2">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-100">
                    {permission.displayName}
                  </p>

                  <p className="truncate text-xs text-neutral-500">
                    {permission.userEmail}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-400">
                    {permission.role}
                  </span>

                  {permission.role !== "OWNER" && (
                    <button
                      type="button"
                      onClick={() => handleRemove(permission.id)}
                      className="rounded-xl border border-red-900/70 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-950/40"
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