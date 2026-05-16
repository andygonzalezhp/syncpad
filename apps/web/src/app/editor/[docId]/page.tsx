import CollaborativeRoom from "@/components/collab/CollaborativeRoom";
import EditorHeader from "@/components/editor/EditorHeader";
import { getDocument } from "@/lib/api";
import { notFound } from "next/navigation";

type EditorPageProps = {
  params: Promise<{
    docId: string;
  }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { docId } = await params;

  let document;

  try {
    document = await getDocument(docId);
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <EditorHeader docId={docId} initialTitle={document.title} />
        <CollaborativeRoom docId={docId} />
      </div>
    </main>
  );
}