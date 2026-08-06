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
    <main className="min-h-screen bg-[#f7f7f5] text-[#20201e]">
      <EditorHeader
        docId={documentId}
        initialTitle={document.title}
        currentUserRole={document.role}
      />

      <div className="px-2 pb-20 sm:px-4 lg:px-6">
        <CollaborativeRoom
          docId={documentId}
          currentUserRole={document.role}
        />

        <div id="sharing-panel" className="mx-auto mt-16 max-w-[900px] scroll-mt-24">
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 text-[#20201e]">
      <section className="max-w-xl rounded-[1.75rem] bg-white p-8 text-center shadow-[0_1px_2px_rgba(20,20,18,0.04),0_20px_60px_rgba(20,20,18,0.07)] ring-1 ring-black/[0.05] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
          SyncPad
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
          Your session could not be verified.
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-[#6f6f6b]">
          Refresh your session and try opening the document again. This does not
          mean the document is missing or that your access was removed.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <form action={`/editor/${docId}`} method="get">
            <button
              type="submit"
              className="rounded-xl bg-[#20201e] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20201e]"
            >
              Refresh session
            </button>
          </form>
          <Link
            href="/"
            className="rounded-xl bg-[#f1f1ee] px-5 py-3 text-sm font-semibold text-[#20201e] transition duration-200 hover:bg-[#e9e9e5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20201e]"
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 text-[#20201e]">
      <section className="max-w-xl rounded-[1.75rem] bg-white p-8 text-center shadow-[0_1px_2px_rgba(20,20,18,0.04),0_20px_60px_rgba(20,20,18,0.07)] ring-1 ring-black/[0.05] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#777771]">
          SyncPad
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
          You do not have access to this document.
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-[#6f6f6b]">
          Ask the document owner to share it with your signed-in email address.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex rounded-xl bg-[#20201e] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20201e]"
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
