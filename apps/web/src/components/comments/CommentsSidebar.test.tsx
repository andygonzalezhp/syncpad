import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { commentThreadFixture, testAuthor } from "@/test/fixtures";
import CommentsSidebar from "./CommentsSidebar";

const openThread = commentThreadFixture({ selectedText: "Open selection" });
const resolvedThread = commentThreadFixture({
  id: "40000000-0000-4000-8000-000000000009",
  selectedText: "Resolved selection",
  status: "RESOLVED",
  resolvedBy: testAuthor,
  resolvedAt: "2026-08-06T13:00:00Z",
});

function SidebarHarness() {
  const [showResolved, setShowResolved] = useState(false);

  return (
    <CommentsSidebar
      threads={[openThread, resolvedThread]}
      activeThreadId={null}
      anchoredThreadIds={new Set([openThread.id, resolvedThread.id])}
      pendingComment={null}
      canComment
      isLoading={false}
      loadError={null}
      mutationError={null}
      mutation={[]}
      showResolvedComments={showResolved}
      onClose={vi.fn()}
      onRefresh={vi.fn()}
      onCancelCreate={vi.fn()}
      onCreate={vi.fn(async () => undefined)}
      onSelectThread={vi.fn()}
      onReply={vi.fn(async () => undefined)}
      onChangeStatus={vi.fn(async () => undefined)}
      onShowResolvedComments={setShowResolved}
    />
  );
}

describe("CommentsSidebar", () => {
  it("hides resolved threads by default and reveals them through the filter", async () => {
    const user = userEvent.setup();
    render(<SidebarHarness />);

    expect(screen.getByText("Open selection")).toBeVisible();
    expect(screen.queryByText("Resolved selection")).not.toBeInTheDocument();
    expect(screen.getByLabelText("1 open comments")).toBeVisible();
    expect(screen.getByLabelText("1 resolved comments")).toBeVisible();

    await user.click(
      screen.getByRole("checkbox", { name: "Show resolved comments" }),
    );
    expect(screen.getByText("Resolved selection")).toBeVisible();
  });

  it("presents deterministic loading and retry states", async () => {
    const onRefresh = vi.fn();
    const props: React.ComponentProps<typeof CommentsSidebar> = {
      threads: [],
      activeThreadId: null,
      anchoredThreadIds: new Set(),
      pendingComment: null,
      canComment: false,
      isLoading: true,
      loadError: null,
      mutationError: null,
      mutation: [],
      showResolvedComments: false,
      onClose: vi.fn(),
      onRefresh,
      onCancelCreate: vi.fn(),
      onCreate: vi.fn(async () => undefined),
      onSelectThread: vi.fn(),
      onReply: vi.fn(async () => undefined),
      onChangeStatus: vi.fn(async () => undefined),
      onShowResolvedComments: vi.fn(),
    };
    const view = render(<CommentsSidebar {...props} />);
    expect(screen.getByText("Loading comments...")).toBeVisible();

    view.rerender(
      <CommentsSidebar
        {...props}
        isLoading={false}
        loadError="Comments could not be loaded."
      />,
    );
    expect(screen.getByText("Comments could not be loaded.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
