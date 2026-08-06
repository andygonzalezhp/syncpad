"use client";

import { useEffect } from "react";
import Link from "next/link";

type EditorErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function EditorError({
  error,
  unstable_retry,
}: EditorErrorProps) {
  useEffect(() => {
    console.error("Could not load the SyncPad editor route", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f3f4] px-6 text-[#1d1d1f]">
      <section className="max-w-xl rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">
          SyncPad
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
          The document service is unavailable.
        </h1>
        <p className="mt-3 leading-7 text-[#6e6e73]">
          Your document was not reported missing. This may be a temporary
          connection problem, so it is safe to try loading it again.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]"
          >
            Try again
          </button>
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
