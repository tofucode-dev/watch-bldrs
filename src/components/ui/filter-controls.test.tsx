import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterControls, type FilterDimension } from "@/components/ui/filter-controls";

const baseDimensions: FilterDimension[] = [
  {
    id: "style",
    label: "Style",
    options: [
      { value: "", label: "All" },
      { value: "diver", label: "Diver" },
      { value: "pilot", label: "Pilot" },
    ],
  },
  {
    id: "movement",
    label: "Movement",
    options: [
      { value: "", label: "All" },
      { value: "automatic", label: "Automatic" },
    ],
  },
];

afterEach(() => {
  cleanup();
});

describe("FilterControls", () => {
  it("renders no chips and no Clear all when every value is empty", () => {
    render(<FilterControls dimensions={baseDimensions} onDimensionChange={vi.fn()} onClearAll={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /Remove .* filter/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
  });

  it("renders one chip with the selected label when one dimension is set", () => {
    render(
      <FilterControls
        dimensions={[{ ...baseDimensions[0], value: "diver" }, baseDimensions[1]]}
        onDimensionChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Remove Diver filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
  });

  it("falls back to the raw value when the active option label is missing", () => {
    render(
      <FilterControls
        dimensions={[
          {
            id: "style",
            label: "Style",
            options: [{ value: "", label: "All" }],
            value: "custom",
          },
        ]}
        onDimensionChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByText("custom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove custom filter" })).toBeInTheDocument();
  });

  it("calls onDimensionChange with the dimension id and empty value when a chip is removed", async () => {
    const user = userEvent.setup();
    const onDimensionChange = vi.fn();

    render(
      <FilterControls
        dimensions={[{ ...baseDimensions[0], value: "pilot" }, baseDimensions[1]]}
        onDimensionChange={onDimensionChange}
        onClearAll={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove Pilot filter" }));

    expect(onDimensionChange).toHaveBeenCalledWith("style", "");
  });

  it("calls onClearAll when Clear all is activated", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();

    render(
      <FilterControls
        dimensions={[
          { ...baseDimensions[0], value: "diver" },
          { ...baseDimensions[1], value: "automatic" },
        ]}
        onDimensionChange={vi.fn()}
        onClearAll={onClearAll}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
