import CollaborativeRoom from "@/components/collab/CollaborativeRoom";

type EditorPageProps = {
  params: Promise<{
    docId: string;
  }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { docId } = await params;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            SyncPad
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Collaborative Editor
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