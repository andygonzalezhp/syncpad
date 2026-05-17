import { auth } from "@clerk/nextjs/server";
import { API_URL, bearerHeaders, DocumentSummary } from "@/lib/api";

async function getApiToken(): Promise<string> {
  const { getToken } = await auth();

  const token = await getToken({
    template: "syncpad",
  });

  if (!token) {
    throw new Error("Could not create SyncPad API token.");
  }

  return token;
}

export async function getDocument(id: string): Promise<DocumentSummary> {
  const token = await getApiToken();

  const response = await fetch(`${API_URL}/api/documents/${id}`, {
    cache: "no-store",
    headers: bearerHeaders(token),
  });

  if (!response.ok) {
    throw new Error("Failed to load document");
  }

  return response.json();
}