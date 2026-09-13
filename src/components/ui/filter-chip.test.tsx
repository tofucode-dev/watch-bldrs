import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterChip } from "@/components/ui/filter-chip";

afterEach(() => {
  cleanup();
});

describe("FilterChip", () => {
  it("renders the caller label and a remove control whose accessible name includes that label", () => {
    render(<FilterChip label="Diver" onRemove={vi.fn()} />);

    expect(screen.getByText("Diver")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Diver filter" })).toBeInTheDocument();
  });

  it("invokes onRemove when the remove control is activated", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(<FilterChip label="Pilot" onRemove={onRemove} />);

    await user.click(screen.getByRole("button", { name: "Remove Pilot filter" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onRemove when disabled", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(<FilterChip label="Pilot" onRemove={onRemove} disabled />);

    await user.click(screen.getByRole("button", { name: "Remove Pilot filter" }));

    expect(onRemove).not.toHaveBeenCalled();
  });
});
