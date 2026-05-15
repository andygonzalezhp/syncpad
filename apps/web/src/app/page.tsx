import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <section className="max-w-2xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          SyncPad
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-tight md:text-7xl">
          Real-time collaborative editing.
        </h1>

        <p className="mt-6 text-lg leading-8 text-neutral-400">
          A collaborative document editor built with Next.js, Spring Boot,
          Hocuspocus, Yjs, PostgreSQL, Redis, and WebSockets.
        </p>

        <div className="mt-8">
          <Link
            href="/editor/demo-doc"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 hover:bg-neutral-200"
          >
            Open demo document
          </Link>
        </div>
      </section>
    </main>
  );
}