import CollaborativeRoom from "@/components/collab/CollaborativeRoom";
import { getDocument } from "@/lib/api";

type EditorPageProps = {
  params: Promise<{
    docId: string;
  }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { docId } = await params;

  let title = "Untitled document";

  try {
    const document = await getDocument(docId);
    title = document.title;
  } catch {
    title = "Unknown document";
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            SyncPad
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {title}
          </h1>

          <p className="mt-2 text-sm text-neutral-400">
            Document ID:{" "}
            <span className="rounded bg-neutral-900 px-2 py-1 font-mono text-neutral-200">
              {docId}
            </span>
          </p>
        </div>

        <CollaborativeRoom docId={docId} />
      </div>
    </main>
  );
}