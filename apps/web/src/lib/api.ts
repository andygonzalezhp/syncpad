export type DocumentRole = "OWNER" | "EDITOR" | "VIEWER";

export type DocumentSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  role: DocumentRole;
};

export type DocumentPermission = {
  id: string;
  userEmail: string;
  displayName: string;
  role: DocumentRole;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const DEV_USER_EMAIL =
  process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? "andy@syncpad.dev";

const userHeaders = {
  "X-User-Email": DEV_USER_EMAIL,
};

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_URL}/api/documents`, {
    cache: "no-store",
    headers: userHeaders,
  });

  if (!response.ok) {
    throw new Error("Failed to load documents");
  }

  return response.json();
}

export async function getDocument(id: string): Promise<DocumentSummary> {
  const response = await fetch(`${API_URL}/api/documents/${id}`, {
    cache: "no-store",
    headers: userHeaders,
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
      ...userHeaders,
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
      ...userHeaders,
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
    headers: userHeaders,
  });

  if (!response.ok) {
    throw new Error("Failed to delete document");
  }
}

export async function listDocumentPermissions(
  documentId: string,
): Promise<DocumentPermission[]> {
  const response = await fetch(`${API_URL}/api/documents/${documentId}/permissions`, {
    cache: "no-store",
    headers: userHeaders,
  });

  if (!response.ok) {
    throw new Error("Failed to load document permissions");
  }

  return response.json();
}

export async function shareDocument(
  documentId: string,
  email: string,
  role: Exclude<DocumentRole, "OWNER">,
): Promise<DocumentPermission> {
  const response = await fetch(`${API_URL}/api/documents/${documentId}/permissions`, {
    method: "POST",
    headers: {
      ...userHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, role }),
  });

  if (!response.ok) {
    throw new Error("Failed to share document");
  }

  return response.json();
}

export async function removeDocumentPermission(
  documentId: string,
  permissionId: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/documents/${documentId}/permissions/${permissionId}`,
    {
      method: "DELETE",
      headers: userHeaders,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to remove document permission");
  }
}