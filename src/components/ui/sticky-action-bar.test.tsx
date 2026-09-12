import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StickyActionBar } from "@/components/ui/sticky-action-bar";

afterEach(() => {
  cleanup();
});

describe("StickyActionBar", () => {
  it("renders status, secondary, and primary slots", () => {
    const { container } = render(
      <StickyActionBar
        status="Nothing saved yet"
        secondary={<button type="button">Discard</button>}
        primary={<button type="button">Save Draft</button>}
      />,
    );

    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Draft" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot='sticky-action-bar']")).toHaveClass("bg-sticky");
  });

  it("does not submit a form by itself", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <StickyActionBar status="Unsaved" secondary={<span>Idle</span>} primary={<span>Ready</span>} />
      </form>,
    );

    expect(screen.getByText("Unsaved").closest("[data-slot='sticky-action-bar']")?.tagName).toBe("DIV");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    await user.click(screen.getByText("Unsaved"));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
