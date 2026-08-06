"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  API_URL,
  bearerHeaders,
  CommentThread,
  DocumentPermission,
  DocumentRole,
  DocumentSummary,
} from "@/lib/api";
import { commentDebug } from "@/lib/commentDebug";

type ApiErrorBody = {
  message?: unknown;
};

function messageFromApiBody(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string" &&
    body.message.trim()
  ) {
    return body.message;
  }

  return fallback;
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function apiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // The fallback remains useful when the API did not return JSON.
  }

  return fallback;
}

async function safeApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  if (response.status >= 500) {
    return fallback;
  }

  const message = await apiErrorMessage(response, fallback);

  if (/\b(?:database|exception|jwt|stack trace|token template)\b/i.test(message)) {
    return fallback;
  }

  return message;
}

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
  const authError = !isLoaded
    ? null
    : !isSignedIn
      ? "Sign in to access your SyncPad documents."
      : !currentUserEmail
        ? "Your account needs an email address before you can use SyncPad."
        : null;

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
      throw new Error(
        await safeApiErrorMessage(response, "Could not load documents."),
      );
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
      throw new Error(
        await safeApiErrorMessage(response, "Could not create document."),
      );
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
      throw new Error(
        await safeApiErrorMessage(response, "Could not save title."),
      );
    }

    return response.json();
  }

  async function deleteDocument(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/documents/${id}`, {
      method: "DELETE",
      headers: await getApiHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        await safeApiErrorMessage(response, "Could not delete document."),
      );
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
      throw new Error(
        await safeApiErrorMessage(response, "Could not load collaborators."),
      );
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
      throw new Error(
        await safeApiErrorMessage(response, "Could not share document."),
      );
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
      throw new Error(
        await safeApiErrorMessage(response, "Could not remove collaborator."),
      );
    }
  }

  async function listComments(documentId: string): Promise<CommentThread[]> {
    const response = await fetch(
      `${API_URL}/api/documents/${documentId}/comments`,
      {
        cache: "no-store",
        headers: await getApiHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        await apiErrorMessage(response, "Failed to load comments."),
      );
    }

    return response.json();
  }

  async function getComment(
    documentId: string,
    threadId: string,
  ): Promise<CommentThread> {
    const url = `${API_URL}/api/documents/${documentId}/comments/${threadId}`;

    commentDebug("fetching thread after realtime event", {
      method: "GET",
      url,
    });

    const response = await fetch(url, {
      cache: "no-store",
      headers: await getApiHeaders(),
    });
    const responseBody = await readResponseBody(response);

    commentDebug("realtime thread response received", {
      method: "GET",
      url,
      status: response.status,
      ok: response.ok,
      body: responseBody,
    });

    if (!response.ok) {
      throw new Error(
        messageFromApiBody(responseBody, "Failed to load updated comment."),
      );
    }

    return responseBody as CommentThread;
  }

  async function createComment(
    documentId: string,
    selectedText: string,
    message: string,
  ): Promise<CommentThread> {
    const response = await fetch(
      `${API_URL}/api/documents/${documentId}/comments`,
      {
        method: "POST",
        headers: await getApiHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ selectedText, message }),
      },
    );

    if (!response.ok) {
      throw new Error(
        await apiErrorMessage(response, "Failed to create comment."),
      );
    }

    return response.json();
  }

  async function addCommentReply(
    documentId: string,
    threadId: string,
    message: string,
  ): Promise<CommentThread> {
    const url = `${API_URL}/api/documents/${documentId}/comments/${threadId}/replies`;
    const headers = await getApiHeaders({
      "Content-Type": "application/json",
    });
    const body = { message };

    commentDebug("sending reply request", {
      method: "POST",
      url,
      body,
      authorizationAttached: new Headers(headers).has("Authorization"),
    });

    const response = await fetch(
      url,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
    );
    const responseBody = await readResponseBody(response);

    commentDebug("reply response received", {
      method: "POST",
      url,
      status: response.status,
      ok: response.ok,
      body: responseBody,
    });

    if (!response.ok) {
      throw new Error(
        messageFromApiBody(responseBody, "Failed to add reply."),
      );
    }

    return responseBody as CommentThread;
  }

  async function setCommentResolved(
    documentId: string,
    threadId: string,
    resolved: boolean,
  ): Promise<CommentThread> {
    const action = resolved ? "resolve" : "reopen";
    const url = `${API_URL}/api/documents/${documentId}/comments/${threadId}/${action}`;
    const headers = await getApiHeaders();

    commentDebug("sending status request", {
      method: "PATCH",
      url,
      requestedStatus: resolved ? "RESOLVED" : "OPEN",
      authorizationAttached: new Headers(headers).has("Authorization"),
    });

    const response = await fetch(
      url,
      {
        method: "PATCH",
        headers,
      },
    );
    const responseBody = await readResponseBody(response);

    commentDebug("status response received", {
      method: "PATCH",
      url,
      status: response.status,
      ok: response.ok,
      body: responseBody,
    });

    if (!response.ok) {
      throw new Error(
        messageFromApiBody(
          responseBody,
          resolved ? "Failed to resolve comment." : "Failed to reopen comment.",
        ),
      );
    }

    return responseBody as CommentThread;
  }

  return {
    isAuthReady,
    authError,
    currentUserEmail,
    listDocuments,
    createDocument,
    renameDocument,
    deleteDocument,
    listDocumentPermissions,
    shareDocument,
    removeDocumentPermission,
    listComments,
    getComment,
    createComment,
    addCommentReply,
    setCommentResolved,
  };
}
