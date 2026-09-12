import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PartsListHeader, PartsRow } from "@/components/ui/parts-row";

afterEach(() => {
  cleanup();
});

describe("PartsRow", () => {
  it("renders caller-provided index, cell accessible names, and action", () => {
    render(
      <PartsRow
        index={1}
        cells={[
          { label: "Widget", htmlFor: "widget", control: <input id="widget" /> },
          { label: "Label", htmlFor: "part-label", control: <input id="part-label" /> },
        ]}
        action={<button type="button">Remove</button>}
      />,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Widget" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Label" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
    expect(screen.queryByText("USD")).not.toBeInTheDocument();
  });

  it("keeps a second row independent of the first", () => {
    render(
      <>
        <PartsRow
          index={1}
          cells={[{ label: "Name", htmlFor: "name-1", control: <input id="name-1" defaultValue="Explorer Dial" /> }]}
          action={<button type="button">Remove part 1</button>}
        />
        <PartsRow
          index={2}
          cells={[{ label: "Name", htmlFor: "name-2", control: <input id="name-2" defaultValue="NH35" /> }]}
          action={<button type="button">Remove part 2</button>}
        />
      </>,
    );

    expect(screen.getByDisplayValue("Explorer Dial")).toBeInTheDocument();
    expect(screen.getByDisplayValue("NH35")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove part 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove part 2" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox", { name: "Name" })).toHaveLength(2);
  });

  it("keeps both markup branches: desktop header and per-cell md:sr-only labels", () => {
    const { container } = render(
      <>
        <PartsListHeader columns={["Category", "Name"]} />
        <PartsRow
          index={1}
          cells={[
            { label: "Category", htmlFor: "category", control: <input id="category" /> },
            { label: "Name", htmlFor: "name", control: <input id="name" /> },
          ]}
        />
      </>,
    );

    const header = container.querySelector("[data-slot='parts-list-header']");
    expect(header).toBeTruthy();
    expect(header).toHaveClass("hidden", "md:grid");
    expect(header).toHaveTextContent("Category");
    expect(header).toHaveTextContent("Name");

    const cellLabels = container.querySelectorAll("[data-slot='parts-row-cell-label']");
    expect(cellLabels).toHaveLength(2);
    for (const label of cellLabels) {
      expect(label).toHaveClass("md:sr-only");
    }
  });
});
