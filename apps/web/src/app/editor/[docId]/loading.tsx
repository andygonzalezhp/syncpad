export default function EditorLoading() {
  return (
    <main
      className="min-h-screen bg-[#f7f7f5] px-3 py-3 text-[#20201e] md:px-6"
      aria-busy="true"
    >
      <div className="animate-pulse">
        <div className="h-16 rounded-2xl bg-white ring-1 ring-black/[0.05]" />

        <div className="mt-2 rounded-2xl bg-[#f7f7f5] p-2">
          <div className="h-12 rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.05]" />
          <div className="mx-auto mt-9 min-h-[70vh] max-w-[900px] rounded-sm bg-white shadow-[0_18px_60px_rgba(20,20,18,0.07)] ring-1 ring-black/[0.05]" />
        </div>
      </div>

      <p className="sr-only" role="status">
        Loading document editor
      </p>
    </main>
  );
}
