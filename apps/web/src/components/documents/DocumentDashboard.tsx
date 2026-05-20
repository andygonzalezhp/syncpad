"use client";

import Link from "next/link";
import { FormEvent, MouseEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentSummary } from "@/lib/api";
import { useSyncPadApi } from "@/lib/useSyncPadApi";

export default function DocumentDashboard() {
  const router = useRouter();

  const {
    isAuthReady,
    currentUserEmail,
    listDocuments,
    createDocument,
    deleteDocument,
  } = useSyncPadApi();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [title, setTitle] = useState("Untitled document");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);

  async function loadDocuments() {
    if (!isAuthReady) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await listDocuments();
      setDocuments(data);
    } catch {
      setError("Could not load documents.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady]);

  async function handleCreateDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Document title cannot be empty.");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const document = await createDocument(trimmedTitle);

      setTitle("Untitled document");
      router.push(`/editor/${document.id}`);
    } catch {
      setError("Could not create document.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteDocument(
    event: MouseEvent<HTMLButtonElement>,
    document: DocumentSummary,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (document.role !== "OWNER") {
      setError("Only the document owner can delete this document.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${document.title}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const previousDocuments = documents;

    try {
      setError(null);

      setDeletingDocumentIds((current) => {
        const next = new Set(current);
        next.add(document.id);
        return next;
      });

      setDocuments((current) =>
        current.filter((currentDocument) => currentDocument.id !== document.id),
      );

      await deleteDocument(document.id);
    } catch {
      setDocuments(previousDocuments);
      setError(
        "Could not delete document. Make sure you are the owner and the API is running.",
      );
    } finally {
      setDeletingDocumentIds((current) => {
        const next = new Set(current);
        next.delete(document.id);
        return next;
      });
    }
  }

  if (!isAuthReady) {
    return (
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-[2rem] border border-neutral-800 bg-neutral-950/80 p-6 text-neutral-400 shadow-2xl">
          Loading your SyncPad workspace...
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-10 rounded-[2rem] border border-neutral-800 bg-neutral-950/80 p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-100">
              {currentUserEmail?.split("@")[0] ?? "Signed in"}
            </p>
            <p className="truncate text-sm text-neutral-500">
              {currentUserEmail}
            </p>
          </div>

          <div className="h-10 w-10 rounded-full border border-neutral-700 bg-neutral-900" />
        </div>
      </div>

      <p className="text-sm uppercase tracking-[0.35em] text-neutral-500">
        SyncPad
      </p>

      <h1 className="mt-6 max-w-4xl text-6xl font-semibold tracking-[-0.08em] text-neutral-50 md:text-7xl">
        Real-time collaborative editing.
      </h1>

      <p className="mt-8 max-w-3xl text-xl leading-9 text-neutral-400">
        Create shared documents, edit together in real time, and sync changes
        through a Yjs-powered WebSocket collaboration layer.
      </p>

      <div className="mt-12 rounded-[2rem] border border-neutral-800 bg-neutral-950/80 p-6 shadow-2xl">
        <form
          onSubmit={handleCreateDocument}
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]"
        >
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
            }}
            className="min-h-14 rounded-2xl border border-neutral-700 bg-neutral-950 px-5 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-400"
            placeholder="Document title"
          />

          <button
            type="submit"
            disabled={isCreating}
            className="min-h-14 rounded-2xl bg-white px-5 font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create document"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
              Documents
            </h2>

            <p className="text-sm text-neutral-500">
              {documents.length}{" "}
              {documents.length === 1 ? "document" : "documents"}
            </p>
          </div>

          {isLoading ? (
            <p className="mt-6 text-neutral-400">Loading documents...</p>
          ) : documents.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-neutral-800 bg-neutral-950 p-8 text-neutral-400">
              No documents yet. Create your first SyncPad document above.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {documents.map((document) => {
                const isDeleting = deletingDocumentIds.has(document.id);
                const canDelete = document.role === "OWNER";

                return (
                  <article
                    key={document.id}
                    className="group rounded-3xl border border-neutral-800 bg-neutral-950 p-5 transition hover:border-neutral-600 hover:bg-neutral-900/80"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <Link
                        href={`/editor/${document.id}`}
                        className="min-w-0 flex-1"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-medium text-neutral-100">
                            {document.title}
                          </h3>

                          <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-xs text-neutral-400">
                            {document.role}
                          </span>
                        </div>

                        <p className="mt-3 truncate font-mono text-xs text-neutral-500">
                          {document.id}
                        </p>

                        <p className="mt-3 text-sm text-neutral-500">
                          Updated{" "}
                          {new Date(document.updatedAt).toLocaleString()}
                        </p>
                      </Link>

                      {canDelete && (
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={(event) =>
                            handleDeleteDocument(event, document)
                          }
                          className="rounded-2xl border border-red-900/80 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}