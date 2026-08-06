import { vi } from "vitest";

export const navigationMocks = {
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
};

export function createNavigationModuleMock() {
  return { useRouter: () => navigationMocks };
}
