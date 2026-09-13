import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PaperLabel } from "@/components/ui/paper-label";

afterEach(() => {
  cleanup();
});

describe("PaperLabel", () => {
  it("renders caller-provided text", () => {
    render(<PaperLabel>Diver</PaperLabel>);

    expect(screen.getByText("Diver")).toBeInTheDocument();
  });

  it("forwards native span props", () => {
    render(
      <PaperLabel id="style-label" data-testid="style-label">
        Field
      </PaperLabel>,
    );

    const label = screen.getByTestId("style-label");
    expect(label).toHaveAttribute("id", "style-label");
    expect(label.tagName).toBe("SPAN");
  });

  it("merges custom classes with tone and rotation variants", () => {
    const { container } = render(
      <PaperLabel tone="olive" rotation="left" className="custom-label">
        Olive
      </PaperLabel>,
    );

    const label = container.querySelector("[data-slot='paper-label']");
    expect(label).toHaveClass("custom-label");
    expect(label).toHaveClass("bg-olive");
    expect(label).toHaveClass("-rotate-2");
  });

  it("does not introduce interactive behavior", () => {
    render(<PaperLabel>Pilot</PaperLabel>);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
