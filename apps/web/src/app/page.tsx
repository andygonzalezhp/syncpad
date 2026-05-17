import AuthBar from "@/components/auth/AuthBar";
import DocumentDashboard from "@/components/documents/DocumentDashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-100">
      <section className="mx-auto mb-10 max-w-4xl">
        <AuthBar />

        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          SyncPad
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight md:text-7xl">
          Real-time collaborative editing.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
          Create shared documents, edit together in real time, and sync changes
          through a Yjs-powered WebSocket collaboration layer.
        </p>
      </section>

      <DocumentDashboard />
    </main>
  );
}