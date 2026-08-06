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

export type CommentStatus = "OPEN" | "RESOLVED";

export type CommentAuthor = {
  id: string;
  email: string;
  displayName: string;
};

export type CommentMessage = {
  id: string;
  author: CommentAuthor;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentThread = {
  id: string;
  documentId: string;
  selectedText: string;
  status: CommentStatus;
  createdBy: CommentAuthor;
  resolvedBy: CommentAuthor | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages: CommentMessage[];
};

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function displayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0];

  if (!localPart) {
    return "User";
  }

  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

export function bearerHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}
