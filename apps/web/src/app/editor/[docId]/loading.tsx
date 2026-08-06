export default function EditorLoading() {
  return (
    <main
      className="min-h-screen bg-[#f1f3f4] px-3 py-4 text-[#1d1d1f] md:px-6"
      aria-busy="true"
    >
      <div className="animate-pulse">
        <div className="h-20 rounded-3xl border border-[#dedbd3] bg-white" />

        <div className="mt-3 rounded-3xl border border-[#dedbd3] bg-[#fbfaf7] p-3">
          <div className="h-12 rounded-2xl bg-[#ebe9e4]" />
          <div className="mx-auto mt-6 min-h-[65vh] max-w-[1110px] rounded-sm border border-[#dedbd3] bg-white shadow-sm" />
        </div>
      </div>

      <p className="sr-only" role="status">
        Loading document editor
      </p>
    </main>
  );
}
