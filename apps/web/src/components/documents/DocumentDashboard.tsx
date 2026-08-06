"use client";

import Link from "next/link";
import {
  FormEvent,
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { DocumentRole, DocumentSummary } from "@/lib/api";
import { useSyncPadApi } from "@/lib/useSyncPadApi";

const MAX_DOCUMENT_TITLE_LENGTH = 255;

type DeleteError = {
  documentId: string;
  message: string;
};

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Update time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRole(role: DocumentRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function DocumentDashboard() {
  const router = useRouter();

  const {
    isAuthReady,
    authError,
    currentUserEmail,
    listDocuments,
    createDocument,
    deleteDocument,
  } = useSyncPadApi();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [title, setTitle] = useState("Untitled document");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isNavigationPending, startNavigationTransition] = useTransition();
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(
    null,
  );
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(
    new Set(),
  );
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<DeleteError | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  const deleteOperations = useRef(new Map<string, number>());
  const deleteOperationSequence = useRef(0);
  const createInFlight = useRef(false);
  const createOperationSequence = useRef(0);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  const documentsHeading = useRef<HTMLHeadingElement | null>(null);
  const loadRequestSequence = useRef(0);
  const loadedIdentity = useRef<string | null>(null);
  const currentIdentity = useRef(currentUserEmail);

  useLayoutEffect(() => {
    currentIdentity.current = currentUserEmail;
  }, [currentUserEmail]);

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredDocuments = useMemo(() => {
    if (!normalizedSearchQuery) {
      return documents;
    }

    return documents.filter((document) =>
      document.title.toLocaleLowerCase().includes(normalizedSearchQuery),
    );
  }, [documents, normalizedSearchQuery]);

  async function loadDocuments() {
    const identityChanged = loadedIdentity.current !== currentUserEmail;
    loadedIdentity.current = currentUserEmail;

    if (identityChanged) {
      loadRequestSequence.current += 1;
      createOperationSequence.current += 1;
      createInFlight.current = false;
      deleteOperations.current.clear();
      setDocuments([]);
      setSearchQuery("");
      setTitle("Untitled document");
      setIsCreating(false);
      setOpeningDocumentId(null);
      setDeletingDocumentIds(new Set());
      setDocumentToDelete(null);
      setLoadError(null);
      setCreateError(null);
      setDeleteError(null);
      setDeleteFeedback(null);
    }

    if (!isAuthReady || !currentUserEmail) {
      setIsLoading(false);
      return;
    }

    const requestId = ++loadRequestSequence.current;

    try {
      setIsLoading(true);
      setLoadError(null);

      const data = await listDocuments();

      if (requestId !== loadRequestSequence.current) {
        return;
      }

      setDocuments(data);
    } catch (error) {
      if (requestId !== loadRequestSequence.current) {
        return;
      }

      setLoadError(messageFromError(error, "Could not load documents."));
    } finally {
      if (requestId === loadRequestSequence.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      loadRequestSequence.current += 1;
    };
    // listDocuments is recreated with the current Clerk session on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, currentUserEmail]);

  async function handleCreateDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (createInFlight.current || isCreating || isNavigationPending) {
      return;
    }

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setCreateError("Enter a document title.");
      return;
    }

    const requestIdentity = currentUserEmail;
    const operationId = ++createOperationSequence.current;
    createInFlight.current = true;

    try {
      setIsCreating(true);
      setCreateError(null);

      const createdDocument = await createDocument(trimmedTitle);

      if (
        operationId !== createOperationSequence.current ||
        requestIdentity !== currentIdentity.current
      ) {
        return;
      }

      setTitle("Untitled document");
      startNavigationTransition(() => {
        router.push(`/editor/${createdDocument.id}`);
      });
    } catch (error) {
      if (
        operationId === createOperationSequence.current &&
        requestIdentity === currentIdentity.current
      ) {
        setCreateError(messageFromError(error, "Could not create document."));
      }
    } finally {
      if (operationId === createOperationSequence.current) {
        createInFlight.current = false;
        setIsCreating(false);
      }
    }
  }

  function handleDocumentOpen(
    event: MouseEvent<HTMLAnchorElement>,
    documentId: string,
  ) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    setOpeningDocumentId(documentId);
  }

  function requestDocumentDelete(
    event: MouseEvent<HTMLButtonElement>,
    document: DocumentSummary,
  ) {
    if (document.role !== "OWNER") {
      return;
    }

    deleteTrigger.current = event.currentTarget;
    setDeleteError(null);
    setDeleteFeedback(null);
    setDocumentToDelete(document);
  }

  function cancelDocumentDelete() {
    const trigger = deleteTrigger.current;

    setDocumentToDelete(null);
    setDeleteError(null);

    window.requestAnimationFrame(() => {
      if (trigger?.isConnected) {
        trigger.focus();
      }
    });
  }

  async function confirmDocumentDelete() {
    if (!documentToDelete) {
      return;
    }

    const document = documentToDelete;

    if (deleteOperations.current.has(document.id)) {
      return;
    }

    const requestIdentity = currentUserEmail;
    const operationId = ++deleteOperationSequence.current;
    deleteOperations.current.set(document.id, operationId);
    setDeleteError(null);
    setDeletingDocumentIds((current) => {
      const next = new Set(current);
      next.add(document.id);
      return next;
    });

    try {
      await deleteDocument(document.id);

      if (
        deleteOperations.current.get(document.id) !== operationId ||
        requestIdentity !== currentIdentity.current
      ) {
        return;
      }

      setDocuments((current) =>
        current.filter((currentDocument) => currentDocument.id !== document.id),
      );
      setDeleteFeedback(`Deleted “${document.title}”.`);
      setDocumentToDelete(null);
      setDeleteError(null);

      window.requestAnimationFrame(() => {
        documentsHeading.current?.focus();
      });
    } catch (error) {
      if (
        deleteOperations.current.get(document.id) === operationId &&
        requestIdentity === currentIdentity.current
      ) {
        setDeleteError({
          documentId: document.id,
          message: messageFromError(error, "Could not delete document."),
        });
      }
    } finally {
      if (deleteOperations.current.get(document.id) === operationId) {
        deleteOperations.current.delete(document.id);
        setDeletingDocumentIds((current) => {
          const next = new Set(current);
          next.delete(document.id);
          return next;
        });
      }
    }
  }

  const isCreatingOrOpening = isCreating || isNavigationPending;
  const activeDeleteError =
    documentToDelete && deleteError?.documentId === documentToDelete.id
      ? deleteError.message
      : null;

  return (
    <section aria-labelledby="workspace-heading">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            Your workspace
          </p>

          <h1
            id="workspace-heading"
            className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl"
          >
            Documents
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Start something new or continue working with your collaborators.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Real-time workspace
        </div>
      </div>

      {!isAuthReady ? (
        authError ? (
          <div
            role="alert"
            className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900"
          >
            <h2 className="font-semibold">Your workspace is unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-red-700">{authError}</p>
          </div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm"
          >
            Loading your workspace…
          </div>
        )
      ) : (
        <div className="space-y-6">
          <section
            aria-labelledby="create-document-heading"
            className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] sm:p-7"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-medium text-blue-600"
              >
                +
              </span>
              <div>
                <h2
                  id="create-document-heading"
                  className="text-xl font-semibold tracking-[-0.02em] text-slate-950"
                >
                  New document
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Give it a clear title. You can share it after it opens.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleCreateDocument}
              aria-busy={isCreatingOrOpening}
              className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            >
              <div className="min-w-0">
                <label
                  htmlFor="new-document-title"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Document title
                </label>

                <input
                  id="new-document-title"
                  name="title"
                  value={title}
                  maxLength={MAX_DOCUMENT_TITLE_LENGTH}
                  aria-invalid={Boolean(createError)}
                  aria-describedby={
                    createError
                      ? "new-document-title-hint create-document-error"
                      : "new-document-title-hint"
                  }
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setCreateError(null);
                  }}
                  className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-blue-500 focus:bg-white"
                  placeholder="Document title"
                />

                <p
                  id="new-document-title-hint"
                  className="mt-2 text-xs text-slate-500"
                >
                  Up to {MAX_DOCUMENT_TITLE_LENGTH} characters.
                </p>
              </div>

              <button
                type="submit"
                disabled={isCreatingOrOpening}
                className="min-h-12 rounded-2xl bg-blue-600 px-6 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating
                  ? "Creating…"
                  : isNavigationPending
                    ? "Opening…"
                    : "Create document"}
              </button>
            </form>

            {createError && (
              <p
                id="create-document-error"
                role="alert"
                className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {createError}
              </p>
            )}
          </section>

          <section
            aria-labelledby="documents-heading"
            aria-busy={isLoading}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] sm:p-7"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="documents-heading"
                  ref={documentsHeading}
                  tabIndex={-1}
                  className="text-xl font-semibold tracking-[-0.02em] text-slate-950"
                >
                  Documents
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recently updated documents appear first.
                </p>
              </div>

              <p
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                aria-live="polite"
              >
                {normalizedSearchQuery
                  ? `${filteredDocuments.length} of ${documents.length}`
                  : documents.length}{" "}
                {documents.length === 1 ? "document" : "documents"}
              </p>
            </div>

            {!isLoading && documents.length > 0 && (
              <div className="mt-5" role="search">
                <label
                  htmlFor="document-search"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Search documents
                </label>
                <input
                  id="document-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="min-h-11 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-blue-500 focus:bg-white"
                  placeholder="Search by title"
                />
              </div>
            )}

            {loadError && (
              <div
                role="alert"
                className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <p>{loadError}</p>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void loadDocuments()}
                  className="min-h-10 shrink-0 rounded-xl border border-red-300 bg-white px-4 font-semibold transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Retrying…" : "Try again"}
                </button>
              </div>
            )}

            {deleteFeedback && (
              <p
                role="status"
                aria-live="polite"
                className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {deleteFeedback}
              </p>
            )}

            {isLoading ? (
              <DocumentListSkeleton />
            ) : loadError && documents.length === 0 ? null : documents.length ===
              0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div
                  aria-hidden="true"
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-slate-400 shadow-sm"
                >
                  +
                </div>
                <h3 className="font-semibold text-slate-800">
                  No documents yet
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Create your first document above, then invite collaborators when
                  it opens.
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h3 className="font-semibold text-slate-800">
                  No matching documents
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Try a different title or clear your search.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {filteredDocuments.map((document) => {
                  const isDeleting = deletingDocumentIds.has(document.id);
                  const isOpening = openingDocumentId === document.id;
                  const canDelete = document.role === "OWNER";

                  return (
                    <article
                      key={document.id}
                      aria-busy={isDeleting || isOpening}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                          href={`/editor/${document.id}`}
                          onClick={(event) =>
                            handleDocumentOpen(event, document.id)
                          }
                          className="min-w-0 flex-1 rounded-xl"
                        >
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600 transition group-hover:bg-blue-100">
                            Aa
                          </div>
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="min-w-0 truncate text-lg font-semibold tracking-[-0.02em] text-slate-900">
                              {document.title}
                            </h3>

                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {formatRole(document.role)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-500">
                            Updated{" "}
                            <time dateTime={document.updatedAt}>
                              {formatUpdatedAt(document.updatedAt)}
                            </time>
                          </p>

                          {isOpening && (
                            <span
                              role="status"
                              className="mt-2 block text-sm font-semibold text-blue-600"
                            >
                              Opening…
                            </span>
                          )}
                        </Link>

                        {canDelete && (
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={(event) =>
                              requestDocumentDelete(event, document)
                            }
                            className="min-h-10 rounded-xl border border-transparent px-3 text-sm font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {isAuthReady && documentToDelete && (
        <DeleteDocumentDialog
          document={documentToDelete}
          isDeleting={deletingDocumentIds.has(documentToDelete.id)}
          error={activeDeleteError}
          onCancel={cancelDocumentDelete}
          onConfirm={() => void confirmDocumentDelete()}
        />
      )}
    </section>
  );
}

function DocumentListSkeleton() {
  return (
    <div className="mt-6" role="status" aria-live="polite">
      <span className="sr-only">Loading documents…</span>
      <div aria-hidden="true" className="grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="h-5 w-2/5 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-3/5 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DeleteDocumentDialog({
  document,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: {
  document: DocumentSummary;
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const element = dialog.current;

    if (!element) {
      return;
    }

    if (!element.open) {
      element.showModal();
    }

    return () => {
      if (element.open) {
        element.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-document-title"
      aria-describedby="delete-document-description"
      aria-busy={isDeleting}
      onCancel={(event) => {
        event.preventDefault();

        if (!isDeleting) {
          onCancel();
        }
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
      className="m-auto w-[min(92vw,32rem)] rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-7">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-red-300">
          Delete document
        </p>

        <h2
          id="delete-document-title"
          className="mt-3 break-words text-2xl font-semibold tracking-tight"
        >
          Delete “{document.title}”?
        </h2>

        <p
          id="delete-document-description"
          className="mt-3 text-sm leading-6 text-slate-600"
        >
          This permanently deletes the document and its comments for everyone.
          This action cannot be undone.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            disabled={isDeleting}
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete document"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
