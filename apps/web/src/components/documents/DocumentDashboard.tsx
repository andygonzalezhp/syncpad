"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDocument,
  DocumentSummary,
  listDocuments,
} from "@/lib/api";

export default function DocumentDashboard() {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [title, setTitle] = useState("Untitled document");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDocuments() {
    try {
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
    loadDocuments();
  }, []);

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

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-2xl">
        <form onSubmit={handleCreateDocument} className="flex flex-col gap-3 md:flex-row">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-12 flex-1 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-400"
            placeholder="Document title"
          />

          <button
            type="submit"
            disabled={isCreating}
            className="min-h-12 rounded-2xl bg-white px-5 font-medium text-neutral-950 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
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
          <h2 className="text-sm font-medium uppercase tracking-[0.25em] text-neutral-500">
            Documents
          </h2>

          {isLoading ? (
            <p className="mt-4 text-neutral-400">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="mt-4 text-neutral-400">
              No documents yet. Create your first SyncPad document above.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {documents.map((document) => (
                <Link
                  key={document.id}
                  href={`/editor/${document.id}`}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600 hover:bg-neutral-900"
                >
                  <h3 className="font-medium text-neutral-100">
                    {document.title}
                  </h3>

                  <p className="mt-2 font-mono text-xs text-neutral-500">
                    {document.id}
                  </p>

                  <p className="mt-2 text-xs text-neutral-500">
                    Updated {new Date(document.updatedAt).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}