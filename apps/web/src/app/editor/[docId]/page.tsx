import CollaborativeRoom from "@/components/collab/CollaborativeRoom";
import SharePanel from "@/components/documents/SharePanel";
import EditorHeader from "@/components/editor/EditorHeader";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  API_URL,
  bearerHeaders,
  type DocumentSummary,
} from "@/lib/api";

type EditorPageProps = {
  params: Promise<{
    docId: string;
  }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { docId } = await params;

  if (!isUuid(docId)) {
    notFound();
  }

  const result = await loadDocument(docId);

  if (result.kind === "not-found") {
    notFound();
  }

  if (result.kind === "forbidden") {
    return <DocumentAccessDenied />;
  }

  if (result.kind === "unauthorized") {
    return <DocumentAuthenticationRequired docId={docId} />;
  }

  const document = result.document;
  const documentId = document.id;

  return (
    <main className="min-h-screen bg-[#f1f3f4] text-neutral-900">
      <EditorHeader
        docId={documentId}
        initialTitle={document.title}
        currentUserRole={document.role}
      />

      <div className="px-3 pb-10 pt-3 md:px-6">
        <CollaborativeRoom
          docId={documentId}
          currentUserRole={document.role}
        />

        <div id="sharing-panel" className="mx-auto mt-8 max-w-[1100px]">
          <SharePanel
            documentId={documentId}
            currentUserRole={document.role}
          />
        </div>
      </div>
    </main>
  );
}

async function loadDocument(
  docId: string,
): Promise<
  | { kind: "ok"; document: DocumentSummary }
  | { kind: "not-found" }
  | { kind: "forbidden" }
  | { kind: "unauthorized" }
> {
  const { getToken } = await auth();
  const token = await getToken({ template: "syncpad" });

  if (!token) {
    return { kind: "unauthorized" };
  }

  const response = await fetch(`${API_URL}/api/documents/${docId}`, {
    cache: "no-store",
    headers: bearerHeaders(token),
  });

  if (response.status === 404) {
    return { kind: "not-found" };
  }

  if (response.status === 401) {
    return { kind: "unauthorized" };
  }

  if (response.status === 403) {
    return { kind: "forbidden" };
  }

  if (!response.ok) {
    throw new Error(`Document service returned ${response.status}.`);
  }

  return {
    kind: "ok",
    document: (await response.json()) as DocumentSummary,
  };
}

function DocumentAuthenticationRequired({ docId }: { docId: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f3f4] px-6 text-[#1d1d1f]">
      <section className="max-w-xl rounded-[2rem] border border-amber-300 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
          SyncPad
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
          Your session could not be verified.
        </h1>
        <p className="mt-3 leading-7 text-[#6e6e73]">
          Refresh your session and try opening the document again. This does not
          mean the document is missing or that your access was removed.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <form action={`/editor/${docId}`} method="get">
            <button
              type="submit"
              className="rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]"
            >
              Refresh session
            </button>
          </form>
          <Link
            href="/"
            className="rounded-full border border-[#dedbd3] bg-white px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f4f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]"
          >
            Back to documents
          </Link>
        </div>
      </section>
    </main>
  );
}

function DocumentAccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f3f4] px-6 text-[#1d1d1f]">
      <section className="max-w-xl rounded-[2rem] border border-[#dedbd3] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
          SyncPad
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
          You do not have access to this document.
        </h1>
        <p className="mt-3 leading-7 text-[#6e6e73]">
          Ask the document owner to share it with your signed-in email address.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]"
        >
          Back to documents
        </Link>
      </section>
    </main>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
