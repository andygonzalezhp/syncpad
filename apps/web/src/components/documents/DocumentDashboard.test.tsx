import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { documentFixture } from "@/test/fixtures";
import {
  setSyncPadApiMock,
  type SyncPadApi,
} from "@/test/mocks/api";
import { navigationMocks } from "@/test/mocks/navigation";
import DocumentDashboard from "./DocumentDashboard";

describe("DocumentDashboard", () => {
  let api: SyncPadApi;

  beforeEach(() => {
    api = setSyncPadApiMock();
  });

  it("shows the signed-in loading state while documents are pending", async () => {
    api = setSyncPadApiMock({
      listDocuments: vi.fn(() => new Promise<never>(() => undefined)),
    });

    render(<DocumentDashboard />);

    expect(await screen.findByText("Loading documents…")).toBeInTheDocument();
    expect(api.listDocuments).toHaveBeenCalledOnce();
  });

  it("filters loaded documents by title and can clear an empty result", async () => {
    const user = userEvent.setup();
    api = setSyncPadApiMock({
      listDocuments: vi.fn(async () => [
        documentFixture({ title: "Launch notes" }),
        documentFixture({
          id: "20000000-0000-4000-8000-000000000002",
          title: "Research brief",
        }),
      ]),
    });

    render(<DocumentDashboard />);

    const search = await screen.findByRole("searchbox", {
      name: "Search documents",
    });
    await user.type(search, "research");

    expect(screen.getByRole("heading", { name: "Research brief" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Launch notes" }),
    ).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "missing");
    expect(screen.getByText("No matching documents")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("heading", { name: "Launch notes" })).toBeVisible();
  });

  it("creates a document and navigates to its editor", async () => {
    const user = userEvent.setup();
    const created = documentFixture({
      id: "20000000-0000-4000-8000-000000000099",
      title: "Quarterly plan",
    });
    api = setSyncPadApiMock({
      createDocument: vi.fn(async () => created),
    });

    render(<DocumentDashboard />);

    await screen.findByText("No documents yet");
    const title = screen.getByRole("textbox", { name: "Document title" });
    await user.clear(title);
    await user.type(title, "  Quarterly plan  ");
    await user.click(screen.getByRole("button", { name: "Create document" }));

    await waitFor(() =>
      expect(api.createDocument).toHaveBeenCalledWith("Quarterly plan"),
    );
    expect(navigationMocks.push).toHaveBeenCalledWith(`/editor/${created.id}`);
  });

  it("keeps a document available after deletion fails and supports a retry", async () => {
    const user = userEvent.setup();
    const document = documentFixture();
    const deleteDocument = vi
      .fn()
      .mockRejectedValueOnce(new Error("Delete failed safely."))
      .mockResolvedValueOnce(undefined);
    api = setSyncPadApiMock({
      listDocuments: vi.fn(async () => [document]),
      deleteDocument,
    });

    render(<DocumentDashboard />);

    await screen.findByRole("heading", { name: document.title });
    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog", {
      name: `Delete “${document.title}”?`,
    });
    expect(
      within(dialog).getByText(/permanently deletes the document/i),
    ).toBeVisible();

    await user.click(
      within(dialog).getByRole("button", { name: "Delete document" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Delete failed safely.",
    );
    expect(screen.getByRole("heading", { name: document.title })).toBeVisible();

    await user.click(
      within(dialog).getByRole("button", { name: "Delete document" }),
    );
    expect(await screen.findByText(`Deleted “${document.title}”.`)).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: document.title }),
    ).not.toBeInTheDocument();
  });

  it("shows authentication and document-loading errors", async () => {
    const { rerender } = render(<DocumentDashboard />);

    api = setSyncPadApiMock({
      isAuthReady: false,
      authError: "Sign in to access your SyncPad documents.",
      currentUserEmail: null,
    });
    rerender(<DocumentDashboard />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sign in to access your SyncPad documents.",
    );

    api = setSyncPadApiMock({
      listDocuments: vi.fn(async () => {
        throw new Error("Could not reach the document service.");
      }),
    });
    rerender(<DocumentDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the document service.",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});
