import CollaborativeRoom from "@/components/collab/CollaborativeRoom";
import SharePanel from "@/components/documents/SharePanel";
import EditorHeader from "@/components/editor/EditorHeader";
import { getDocument } from "@/lib/serverApi";
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
    <main className="min-h-screen bg-[#f1f3f4] text-neutral-900">
      <EditorHeader
        docId={docId}
        initialTitle={document.title}
        currentUserRole={document.role}
      />

      <div className="px-3 pb-10 pt-3 md:px-6">
        <CollaborativeRoom
          docId={docId}
          currentUserRole={document.role}
        />

        <div id="sharing-panel" className="mx-auto mt-8 max-w-[1100px]">
          <SharePanel
            documentId={docId}
            currentUserRole={document.role}
          />
        </div>
      </div>
    </main>
  );
}