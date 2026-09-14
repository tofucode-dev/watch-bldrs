import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CatalogFilterBar } from "./catalog-filter-bar";

beforeAll(() => {
  Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: { configurable: true, value: () => false },
    releasePointerCapture: { configurable: true, value: () => undefined },
    scrollIntoView: { configurable: true, value: () => undefined },
    setPointerCapture: { configurable: true, value: () => undefined },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CatalogFilterBar", () => {
  it("navigates with the selected filter and strips existing cursors", async () => {
    const user = userEvent.setup();
    const assign = vi.fn();

    render(
      <CatalogFilterBar
        initialFilters={{
          watch_style: "diver",
          movement: "nh35",
        }}
        navigate={assign}
      />,
    );

    await user.click(screen.getAllByRole("combobox")[2]);
    await user.click(screen.getByRole("option", { name: "Black" }));

    expect(assign).toHaveBeenCalledWith("/builds?watch_style=diver&movement=nh35&dial_colour=black");
    expect(assign.mock.calls[0]?.[0]).not.toContain("before");
    expect(assign.mock.calls[0]?.[0]).not.toContain("after");
  });

  it("clears every active filter back to the unfiltered listing", async () => {
    const user = userEvent.setup();
    const assign = vi.fn();

    render(<CatalogFilterBar initialFilters={{ watch_style: "diver", case_size_mm: 40 }} navigate={assign} />);

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(assign).toHaveBeenCalledWith("/builds");
  });
});
