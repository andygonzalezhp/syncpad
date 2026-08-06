import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
  it("presents the signed-out product entry points and core capabilities", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /write together\.\s*stay on the same page\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /sign in/i })).not.toHaveLength(
      0,
    );
    expect(
      screen.getAllByRole("button", { name: /get started|create your workspace/i }),
    ).not.toHaveLength(0);
    expect(
      screen.getByRole("heading", { name: "Edit together, live" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Keep feedback in context" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Share with confidence" }),
    ).toBeInTheDocument();
  });
});
