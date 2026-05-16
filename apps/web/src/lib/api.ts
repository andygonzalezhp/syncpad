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

export async function getDocument(id: string): Promise<DocumentSummary> {
  const response = await fetch(`${API_URL}/api/documents/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load document");
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

export async function renameDocument(
  id: string,
  title: string,
): Promise<DocumentSummary> {
  const response = await fetch(`${API_URL}/api/documents/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error("Failed to rename document");
  }

  return response.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/documents/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete document");
  }
}