import type { useSyncPadApi } from "@/lib/useSyncPadApi";
import { vi } from "vitest";

export type SyncPadApi = ReturnType<typeof useSyncPadApi>;

export const useSyncPadApiMock = vi.fn();

export function createSyncPadApiMock(
  overrides: Partial<SyncPadApi> = {},
): SyncPadApi {
  return {
    isAuthReady: true,
    authError: null,
    currentUserEmail: "owner@syncpad.test",
    listDocuments: vi.fn(async () => []),
    createDocument: vi.fn(),
    renameDocument: vi.fn(),
    deleteDocument: vi.fn(async () => undefined),
    listDocumentPermissions: vi.fn(async () => []),
    shareDocument: vi.fn(),
    removeDocumentPermission: vi.fn(async () => undefined),
    listComments: vi.fn(async () => []),
    getComment: vi.fn(),
    createComment: vi.fn(),
    addCommentReply: vi.fn(),
    setCommentResolved: vi.fn(),
    ...overrides,
  } as SyncPadApi;
}

export function setSyncPadApiMock(overrides: Partial<SyncPadApi> = {}) {
  const api = createSyncPadApiMock(overrides);
  useSyncPadApiMock.mockReturnValue(api);
  return api;
}

export function createApiModuleMock() {
  return { useSyncPadApi: useSyncPadApiMock };
}
