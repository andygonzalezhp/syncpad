import { auth } from "@clerk/nextjs/server";
import AuthBar from "@/components/auth/AuthBar";
import DocumentDashboard from "@/components/documents/DocumentDashboard";
import LandingPage from "@/components/LandingPage";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    return <LandingPage />;
  }

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f5f7fb] text-slate-900"
    >
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <AuthBar />
        <DocumentDashboard />
      </div>
    </main>
  );
}
