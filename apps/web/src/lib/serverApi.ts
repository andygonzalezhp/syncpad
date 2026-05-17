import { currentUser } from "@clerk/nextjs/server";
import { API_URL, DocumentSummary, userHeaders } from "@/lib/api";

async function getCurrentUserEmail(): Promise<string> {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) {
    throw new Error("Missing authenticated user email.");
  }

  return email;
}

export async function getDocument(id: string): Promise<DocumentSummary> {
  const email = await getCurrentUserEmail();

  const response = await fetch(`${API_URL}/api/documents/${id}`, {
    cache: "no-store",
    headers: userHeaders(email),
  });

  if (!response.ok) {
    throw new Error("Failed to load document");
  }

  return response.json();
}