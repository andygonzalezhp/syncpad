export type DocumentSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_URL}/api/documents`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load documents");
  }

  return response.json();
}

export async function createDocument(title: string): Promise<DocumentSummary> {
  const response = await fetch(`${API_URL}/api/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error("Failed to create document");
  }

  return response.json();
}