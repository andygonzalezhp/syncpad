"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  API_URL,
  bearerHeaders,
  DocumentPermission,
  DocumentRole,
  DocumentSummary,
} from "@/lib/api";

function getBestEmail(user: ReturnType<typeof useUser>["user"]): string | null {
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null
  );
}

export function useSyncPadApi() {
  const { getToken } = useAuth();
  const { user, isLoaded, isSignedIn } = useUser();

  const currentUserEmail = getBestEmail(user);
  const isAuthReady = isLoaded && Boolean(isSignedIn) && Boolean(currentUserEmail);

  async function getApiHeaders(extraHeaders?: HeadersInit): Promise<HeadersInit> {
    const token = await getToken({
      template: "syncpad",
    });

    if (!token) {
      throw new Error("Could not create SyncPad API token.");
    }

    return {
      ...bearerHeaders(token),
      ...extraHeaders,
    };
  }

  async function listDocuments(): Promise<DocumentSummary[]> {
    const response = await fetch(`${API_URL}/api/documents`, {
      cache: "no-store",
      headers: await getApiHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to load documents");
    }

    return response.json();
  }

  async function createDocument(title: string): Promise<DocumentSummary> {
    const response = await fetch(`${API_URL}/api/documents`, {
      method: "POST",
      headers: await getApiHeaders({
        "Content-Type": "application/json",
      }),
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
    const response = await fetch(`${API_URL}/api/documents/${id}`, {
      method: "PATCH",
      headers: await getApiHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error("Failed to rename document");
    }

    return response.json();
  }

  async function deleteDocument(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/documents/${id}`, {
      method: "DELETE",
      headers: await getApiHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to delete document");
    }
  }

  async function listDocumentPermissions(
    documentId: string,
  ): Promise<DocumentPermission[]> {
    const response = await fetch(
      `${API_URL}/api/documents/${documentId}/permissions`,
      {
        cache: "no-store",
        headers: await getApiHeaders(),
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
    const response = await fetch(
      `${API_URL}/api/documents/${documentId}/permissions`,
      {
        method: "POST",
        headers: await getApiHeaders({
          "Content-Type": "application/json",
        }),
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
    const response = await fetch(
      `${API_URL}/api/documents/${documentId}/permissions/${permissionId}`,
      {
        method: "DELETE",
        headers: await getApiHeaders(),
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