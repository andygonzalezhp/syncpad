import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { commentThreadFixture, testAuthor } from "@/test/fixtures";
import CommentThreadCard from "./CommentThreadCard";

function renderCard(
  overrides: Partial<React.ComponentProps<typeof CommentThreadCard>> = {},
) {
  const props: React.ComponentProps<typeof CommentThreadCard> = {
    thread: commentThreadFixture(),
    isActive: false,
    isAnchored: true,
    canComment: true,
    isBusy: false,
    isReplying: false,
    isChangingStatus: false,
    onSelect: vi.fn(),
    onReply: vi.fn(async () => undefined),
    onChangeStatus: vi.fn(async () => undefined),
    ...overrides,
  };

  return { ...render(<CommentThreadCard {...props} />), props };
}

describe("CommentThreadCard", () => {
  it("submits a trimmed reply and clears the draft after success", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn(async () => undefined);
    renderCard({ onReply });

    const reply = screen.getByRole("textbox", { name: "Reply to comment" });
    await user.type(reply, "  Looks good to me.  ");
    await user.click(screen.getByRole("button", { name: "Reply" }));

    expect(onReply).toHaveBeenCalledWith("Looks good to me.");
    expect(reply).toHaveValue("");
  });

  it("requests resolve and reopen transitions from the rendered status", async () => {
    const user = userEvent.setup();
    const onChangeStatus = vi.fn(async () => undefined);
    const view = renderCard({ onChangeStatus });

    await user.click(screen.getByRole("button", { name: "Resolve" }));
    expect(onChangeStatus).toHaveBeenLastCalledWith(true);

    view.rerender(
      <CommentThreadCard
        {...view.props}
        thread={commentThreadFixture({
          status: "RESOLVED",
          resolvedBy: testAuthor,
          resolvedAt: "2026-08-06T12:30:00Z",
        })}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reopen" }));
    expect(onChangeStatus).toHaveBeenLastCalledWith(false);
  });

  it("does not render reply or status mutations for viewers", () => {
    renderCard({ canComment: false });

    expect(
      screen.queryByRole("textbox", { name: "Reply to comment" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Resolve" }),
    ).not.toBeInTheDocument();
  });
});
