import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { createApiModuleMock, setSyncPadApiMock } from "./mocks/api";
import { createClerkModuleMock, setMockClerkUser } from "./mocks/clerk";
import {
  createNavigationModuleMock,
  navigationMocks,
} from "./mocks/navigation";

vi.doMock("@/lib/useSyncPadApi", createApiModuleMock);
vi.doMock("@clerk/nextjs", createClerkModuleMock);
vi.doMock("next/navigation", createNavigationModuleMock);

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  configurable: true,
  value: function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  },
});

Object.defineProperty(HTMLDialogElement.prototype, "close", {
  configurable: true,
  value: function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  },
});

beforeEach(() => {
  setMockClerkUser();
  setSyncPadApiMock();
  navigationMocks.push.mockReset();
  navigationMocks.refresh.mockReset();
  navigationMocks.replace.mockReset();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
});
