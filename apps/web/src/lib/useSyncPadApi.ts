"use client";

import { useUser } from "@clerk/nextjs";
import {
  API_URL,
  DocumentPermission,
  DocumentRole,
  DocumentSummary,
  userHeaders,
} from "@/lib/api";

function getBestEmail(user: ReturnType<typeof useUser>["user"]): string | null {
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null
  );
}

function requireEmail(email: string | null): string {
  if (!email) {
    throw new Error("Authenticated user email is not ready yet.");
  }

  return email;
}

export function useSyncPadApi() {
  const { user, isLoaded, isSignedIn } = useUser();

  const currentUserEmail = getBestEmail(user);
  const isAuthReady = isLoaded && Boolean(isSignedIn) && Boolean(currentUserEmail);

  async function listDocuments(): Promise<DocumentSummary[]> {
    const email = requireEmail(currentUserEmail);

    const response = await fetch(`${API_URL}/api/documents`, {
      cache: "no-store",
      headers: userHeaders(email),
    });

    if (!response.ok) {
      throw new Error("Failed to load documents");
    }

    return response.json();
  }

  async function createDocument(title: string): Promise<DocumentSummary> {
    const email = requireEmail(currentUserEmail);

    const response = await fetch(`${API_URL}/api/documents`, {
      method: "POST",
      headers: {
        ...userHeaders(email),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error("Failed to create document");
    }

    return response.json();
  }

  async function renameDocument(
    id: string,
    title: string,
  ): Promise<DocumentSummary> {
    const email = requireEmail(currentUserEmail);

    const response = await fetch(`${API_URL}/api/documents/${id}`, {
      method: "PATCH",
      headers: {
        ...userHeaders(email),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error("Failed to rename document");
    }

    return response.json();
  }

  async function deleteDocument(id: string): Promise<void> {
    const email = requireEmail(currentUserEmail);

    const response = await fetch(`${API_URL}/api/documents/${id}`, {
      method: "DELETE",
      headers: userHeaders(email),
    });

    if (!response.ok) {
      throw new Error("Failed to delete document");
    }
  }

  async function listDocumentPermissions(
    documentId: string,
  ): Promise<DocumentPermission[]> {
    const email = requireEmail(currentUserEmail);

    const response = await fetch(
      `${API_URL}/api/documents/${documentId}/permissions`,
      {
        cache: "no-store",
        headers: userHeaders(email),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to load document permissions");
    }

    return response.json();
  }

  async function shareDocument(
    documentId: string,
    targetEmail: string,
    role: Exclude<DocumentRole, "OWNER">,
  ): Promise<DocumentPermission> {
    const email = requireEmail(currentUserEmail);

    const response = await fetch(
      `${API_URL}/api/documents/${documentId}/permissions`,
      {
        method: "POST",
        headers: {
          ...userHeaders(email),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail, role }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to share document");
    }

    return response.json();
  }

  async function removeDocumentPermission(
    documentId: string,
    permissionId: string,
  ): Promise<void> {
    const email = requireEmail(currentUserEmail);

    const response = await fetch(
      `${API_URL}/api/documents/${documentId}/permissions/${permissionId}`,
      {
        method: "DELETE",
        headers: userHeaders(email),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to remove document permission");
    }
  }

  return {
    isAuthReady,
    currentUserEmail,
    listDocuments,
    createDocument,
    renameDocument,
    deleteDocument,
    listDocumentPermissions,
    shareDocument,
    removeDocumentPermission,
  };
}