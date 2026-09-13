import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BuildGrid } from "@/components/ui/build-grid";

afterEach(() => {
  cleanup();
});

describe("BuildGrid", () => {
  it("renders semantic list markup with one list item per child", () => {
    render(
      <BuildGrid>
        <div>First</div>
        <div>Second</div>
        <div>Third</div>
      </BuildGrid>,
    );

    const grid = screen.getByRole("list");
    expect(grid.tagName).toBe("UL");

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("First");
    expect(items[1]).toHaveTextContent("Second");
    expect(items[2]).toHaveTextContent("Third");
  });

  it("preserves caller-supplied source order", () => {
    render(
      <BuildGrid>
        <article>Alpha</article>
        <article>Beta</article>
        <article>Gamma</article>
      </BuildGrid>,
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.getByText("Alpha").compareDocumentPosition(screen.getByText("Beta"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText("Beta").compareDocumentPosition(screen.getByText("Gamma"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("applies the responsive grid class contract and merges custom classes", () => {
    const { container } = render(
      <BuildGrid className="custom-grid">
        <div>Card</div>
      </BuildGrid>,
    );

    const grid = container.querySelector("[data-slot='build-grid']");
    expect(grid).toHaveClass("grid", "grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3", "custom-grid");
  });
});
