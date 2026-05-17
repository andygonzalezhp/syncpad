"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentSummary } from "@/lib/api";
import { useSyncPadApi } from "@/lib/useSyncPadApi";

export default function DocumentDashboard() {
  const router = useRouter();

  const {
    isAuthReady,
    listDocuments,
    createDocument,
    deleteDocument,
  } = useSyncPadApi();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [title, setTitle] = useState("Untitled document");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDocuments() {
    try {
      setIsLoading(true);
      setError(null);

      const data = await listDocuments();
      setDocuments(data);
    } catch {
      setError("Could not load documents. Is the Spring Boot API running?");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

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
      router.push(`/editor/${document.id}`);
    } catch {
      setError("Could not create document.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteDocument(id: string) {
    const confirmed = window.confirm(
      "Delete this document? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      await deleteDocument(id);

      setDocuments((current) =>
        current.filter((document) => document.id !== id),
      );
    } catch {
      setError("Could not delete document.");
    }
  }

  if (!isAuthReady) {
    return (
      <section className="mx-auto w-full max-w-4xl">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 text-neutral-300 shadow-2xl">
          Loading authenticated workspace...
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-2xl">
        <form
          onSubmit={handleCreateDocument}
          className="flex flex-col gap-3 md:flex-row"
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-12 flex-1 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-400"
            placeholder="Document title"
          />

          <button
            type="submit"
            disabled={isCreating}
            className="min-h-12 rounded-2xl bg-white px-5 font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create document"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium uppercase tracking-[0.25em] text-neutral-500">
              Documents
            </h2>

            {!isLoading && documents.length > 0 && (
              <p className="text-sm text-neutral-500">
                {documents.length}{" "}
                {documents.length === 1 ? "document" : "documents"}
              </p>
            )}
          </div>

          {isLoading ? (
            <p className="mt-4 text-neutral-400">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="mt-4 text-neutral-400">
              No documents yet. Create your first SyncPad document above.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600 hover:bg-neutral-900"
                >
                  <Link
                    href={`/editor/${document.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-neutral-100">
                        {document.title}
                      </h3>

                      <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                        {document.role}
                      </span>
                    </div>

                    <p className="mt-2 truncate font-mono text-xs text-neutral-500">
                      {document.id}
                    </p>

                    <p className="mt-2 text-xs text-neutral-500">
                      Updated {new Date(document.updatedAt).toLocaleString()}
                    </p>
                  </Link>

                  {document.role === "OWNER" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(document.id)}
                      className="rounded-xl border border-red-900/70 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}