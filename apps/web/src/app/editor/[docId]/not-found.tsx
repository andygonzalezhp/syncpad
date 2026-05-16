import Link from "next/link";

export default function EditorNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <section className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          SyncPad
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Document not found.
        </h1>

        <p className="mt-4 text-neutral-400">
          This document may have been deleted or the link may be invalid.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
        >
          Back to documents
        </Link>
      </section>
    </main>
  );
}