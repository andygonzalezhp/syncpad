"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";

const features = [
  {
    number: "01",
    title: "Edit together, live",
    description:
      "See collaborators, selections, and changes as they happen in the same document.",
    accent: "bg-blue-50 text-blue-700",
  },
  {
    number: "02",
    title: "Keep feedback in context",
    description:
      "Highlight text, start comment threads, reply, resolve, and reopen without losing the conversation.",
    accent: "bg-amber-50 text-amber-700",
  },
  {
    number: "03",
    title: "Share with confidence",
    description:
      "Invite people as viewers or editors and keep document access clear for everyone.",
    accent: "bg-emerald-50 text-emerald-700",
  },
];

export default function LandingPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen overflow-hidden bg-[#fbfbf8] text-[#172033]"
    >
      <header className="relative z-20 border-b border-slate-200/80 bg-[#fbfbf8]/90 backdrop-blur">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <a href="#top" className="flex items-center gap-2.5 rounded-lg">
            <LogoMark />
            <span className="text-lg font-semibold tracking-[-0.03em]">
              SyncPad
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#features"
              className="mr-2 hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 md:block"
            >
              Features
            </a>
            <SignInButton mode="modal" forceRedirectUrl="/">
              <button
                type="button"
                className="min-h-10 rounded-xl px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-slate-950 sm:px-4"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/">
              <button
                type="button"
                className="min-h-10 rounded-xl bg-[#172033] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:px-5"
              >
                Get started
              </button>
            </SignUpButton>
          </div>
        </nav>
      </header>

      <div id="top" className="relative">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-[42rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.13)_0%,rgba(251,251,248,0)_68%)]"
        />

        <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              A calmer way to collaborate
            </div>

            <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
              Write together.
              <span className="block text-blue-600">Stay on the same page.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">
              SyncPad brings real-time editing, focused feedback, and simple
              sharing into one clean workspace for your team.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <SignUpButton mode="modal" forceRedirectUrl="/">
                <button
                  type="button"
                  className="min-h-13 w-full rounded-2xl bg-blue-600 px-7 text-base font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-700 sm:w-auto"
                >
                  Create your workspace
                </button>
              </SignUpButton>
              <SignInButton mode="modal" forceRedirectUrl="/">
                <button
                  type="button"
                  className="min-h-13 w-full rounded-2xl border border-slate-300 bg-white px-7 text-base font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 sm:w-auto"
                >
                  I already have an account
                </button>
              </SignInButton>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Start writing in minutes. No setup required.
            </p>
          </div>

          <ProductPreview />
        </section>
      </div>

      <section
        id="features"
        aria-labelledby="features-heading"
        className="border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Built for shared thinking
            </p>
            <h2
              id="features-heading"
              className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl"
            >
              Everything your document needs. Nothing it doesn&apos;t.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-3xl border border-slate-200 bg-[#fbfbf8] p-6 transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 sm:p-7"
              >
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${feature.accent}`}
                >
                  {feature.number}
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em] text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="workflow-heading" className="bg-[#172033]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 text-white sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              One simple flow
            </p>
            <h2
              id="workflow-heading"
              className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            >
              From blank page to shared progress.
            </h2>
            <p className="mt-5 max-w-lg leading-7 text-slate-300">
              Create a document, invite your people, and keep every decision
              connected to the words that sparked it.
            </p>
          </div>

          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              ["1", "Create", "Name a document and start writing."],
              ["2", "Invite", "Choose who can view or edit."],
              ["3", "Collaborate", "Edit and discuss in real time."],
            ].map(([number, title, description]) => (
              <li
                key={number}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"
              >
                <span className="text-sm font-semibold text-blue-300">
                  {number.padStart(2, "0")}
                </span>
                <h3 className="mt-8 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-blue-600 px-5 py-16 text-center text-white sm:px-8 sm:py-20">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Ready to make ideas move?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-blue-100">
          Bring your next document—and everyone who shapes it—into SyncPad.
        </p>
        <SignUpButton mode="modal" forceRedirectUrl="/">
          <button
            type="button"
            className="mt-7 min-h-12 rounded-2xl bg-white px-7 font-semibold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
          >
            Get started with SyncPad
          </button>
        </SignUpButton>
      </section>

      <footer className="bg-[#fbfbf8] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2 text-slate-800">
            <LogoMark compact />
            <span className="font-semibold">SyncPad</span>
          </div>
          <p>Write. Share. Stay in sync.</p>
        </div>
      </footer>
    </main>
  );
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`${compact ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl"} inline-flex items-center justify-center bg-blue-600 text-sm font-bold text-white shadow-sm`}
    >
      S
    </span>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-6xl sm:mt-20">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2.5rem] bg-blue-200/30 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_35px_90px_rgba(15,23,42,0.18)] sm:rounded-[1.75rem]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <span className="text-xs font-medium text-slate-500">
            Q3 launch plan
          </span>
          <div className="flex -space-x-2" aria-label="Three collaborators">
            <span className="h-6 w-6 rounded-full border-2 border-white bg-violet-400" />
            <span className="h-6 w-6 rounded-full border-2 border-white bg-amber-400" />
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[8px] font-bold text-white">
              +1
            </span>
          </div>
        </div>

        <div className="flex gap-1 overflow-hidden border-b border-slate-200 px-3 py-2 text-[10px] font-medium text-slate-500 sm:px-5">
          {[
            "Undo",
            "Redo",
            "Heading",
            "Bold",
            "Italic",
            "Link",
            "Comment",
          ].map((item) => (
            <span
              key={item}
              className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="grid min-h-[22rem] bg-slate-100/70 md:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="m-3 rounded-xl bg-white px-7 py-9 text-left shadow-sm sm:m-5 sm:px-12 sm:py-11 lg:px-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">
              Launch strategy
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
              Make every release feel effortless
            </h2>
            <div className="mt-6 space-y-3 text-xs leading-6 text-slate-500 sm:text-sm">
              <p>
                Our next launch should focus on a clear story that every team
                can carry into their work.
              </p>
              <p>
                We&apos;ll bring product, support, and growth together around
                <span className="mx-1 rounded bg-amber-200/80 px-1 py-0.5 text-slate-800">
                  one shared customer promise
                </span>
                before the public release.
              </p>
              <div className="mt-5 h-2 w-full rounded bg-slate-100" />
              <div className="h-2 w-5/6 rounded bg-slate-100" />
              <div className="h-2 w-2/3 rounded bg-slate-100" />
            </div>
          </div>

          <aside className="hidden border-l border-slate-200 bg-white p-4 text-left md:block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                Comments
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-700">
                Open
              </span>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-violet-400" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-800">
                    Maya Chen
                  </p>
                  <p className="text-[9px] text-slate-400">Just now</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-600">
                This is the right focus. Can we make the promise more specific?
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-amber-200/70 pt-2 text-[9px] font-semibold">
                <span className="text-slate-500">Reply</span>
                <span className="text-blue-600">Resolve</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Everyone is up to date
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
