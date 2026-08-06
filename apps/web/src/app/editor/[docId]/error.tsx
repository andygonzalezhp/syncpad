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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 text-[#20201e]">
      <section className="max-w-xl rounded-[1.75rem] bg-white p-8 text-center shadow-[0_1px_2px_rgba(20,20,18,0.04),0_20px_60px_rgba(20,20,18,0.07)] ring-1 ring-black/[0.05] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">
          SyncPad
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
          The document service is unavailable.
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-[#6f6f6b]">
          Your document was not reported missing. This may be a temporary
          connection problem, so it is safe to try loading it again.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-xl bg-[#20201e] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20201e]"
          >
            Try again
          </button>
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
