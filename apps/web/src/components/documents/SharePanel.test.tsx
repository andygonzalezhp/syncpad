import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { permissionFixture } from "@/test/fixtures";
import { setSyncPadApiMock } from "@/test/mocks/api";
import SharePanel from "./SharePanel";

describe("SharePanel permissions", () => {
  it.each(["EDITOR", "VIEWER"] as const)(
    "does not expose owner-only sharing controls to a %s",
    (role) => {
      const listDocumentPermissions = vi.fn();
      setSyncPadApiMock({ listDocumentPermissions });

      const { container } = render(
        <SharePanel documentId="document-id" currentUserRole={role} />,
      );

      expect(container).toBeEmptyDOMElement();
      expect(listDocumentPermissions).not.toHaveBeenCalled();
    },
  );

  it("loads owner sharing controls with editor and viewer roles only", async () => {
    setSyncPadApiMock({
      listDocumentPermissions: vi.fn(async () => [permissionFixture()]),
    });

    render(<SharePanel documentId="document-id" currentUserRole="OWNER" />);

    const roleSelect = await screen.findByRole("combobox", {
      name: "Access level",
    });
    expect(roleSelect).toHaveValue("EDITOR");
    expect(screen.getByRole("option", { name: "Editor" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Viewer" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Owner" })).not.toBeInTheDocument();
  });
});
