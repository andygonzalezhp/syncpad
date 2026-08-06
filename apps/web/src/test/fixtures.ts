import type {
  CommentAuthor,
  CommentThread,
  DocumentPermission,
  DocumentSummary,
} from "@/lib/api";

const timestamp = "2026-08-06T12:00:00Z";

export const testAuthor: CommentAuthor = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "owner@syncpad.test",
  displayName: "Test Owner",
};

export function documentFixture(
  overrides: Partial<DocumentSummary> = {},
): DocumentSummary {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    title: "Launch notes",
    role: "OWNER",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

export function permissionFixture(
  overrides: Partial<DocumentPermission> = {},
): DocumentPermission {
  return {
    id: "30000000-0000-4000-8000-000000000001",
    userEmail: "owner@syncpad.test",
    displayName: "Test Owner",
    role: "OWNER",
    createdAt: timestamp,
    ...overrides,
  };
}

export function commentThreadFixture(
  overrides: Partial<CommentThread> = {},
): CommentThread {
  const id = overrides.id ?? "40000000-0000-4000-8000-000000000001";

  return {
    id,
    documentId: "20000000-0000-4000-8000-000000000001",
    selectedText: "one shared customer promise",
    status: "OPEN",
    createdBy: testAuthor,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [
      {
        id: `${id.slice(0, -1)}2`,
        author: testAuthor,
        body: "Can we make this more specific?",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    ...overrides,
  };
}
