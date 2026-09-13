import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListingLoadMore } from "@/components/ui/listing-load-more";

afterEach(() => {
  cleanup();
});

describe("ListingLoadMore", () => {
  it("renders an accessible load-more button with the default label", () => {
    render(<ListingLoadMore />);

    expect(screen.getByRole("button", { name: "Load more builds" })).toBeInTheDocument();
  });

  it("marks the button busy and disabled while loading", () => {
    render(<ListingLoadMore loading />);

    const button = screen.getByRole("button", { name: "Loading…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("forwards clicks only when the control is enabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<ListingLoadMore onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Load more builds" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not forward clicks while loading or disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const { rerender } = render(<ListingLoadMore loading onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "Loading…" }));
    expect(onClick).not.toHaveBeenCalled();

    rerender(<ListingLoadMore disabled onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "Load more builds" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders caller-configurable end-of-list copy instead of a button", () => {
    render(<ListingLoadMore hasMore={false} endLabel="You reached the end" />);

    expect(screen.getByText("You reached the end")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
