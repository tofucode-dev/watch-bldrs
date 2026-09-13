import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";

afterEach(() => {
  cleanup();
});

describe("Badge", () => {
  it("renders caller-provided text", () => {
    render(<Badge>NH35</Badge>);

    expect(screen.getByText("NH35")).toBeInTheDocument();
  });

  it("forwards native span props", () => {
    render(
      <Badge id="movement-tag" data-testid="movement-badge">
        40mm
      </Badge>,
    );

    const badge = screen.getByTestId("movement-badge");
    expect(badge).toHaveAttribute("id", "movement-tag");
    expect(badge.tagName).toBe("SPAN");
  });

  it("merges custom classes with variant styles", () => {
    const { container } = render(
      <Badge variant="olive" className="custom-badge">
        Olive
      </Badge>,
    );

    const badge = container.querySelector("[data-slot='badge']");
    expect(badge).toHaveClass("custom-badge");
    expect(badge).toHaveClass("bg-olive");
  });

  it("applies selected tonal variants", () => {
    const { container, rerender } = render(<Badge variant="mustard">Mustard</Badge>);
    expect(container.querySelector("[data-slot='badge']")).toHaveClass("bg-mustard");

    rerender(<Badge variant="field">Field</Badge>);
    expect(container.querySelector("[data-slot='badge']")).toHaveClass("bg-field");

    rerender(<Badge variant="pilot">Pilot</Badge>);
    expect(container.querySelector("[data-slot='badge']")).toHaveClass("bg-pilot");

    rerender(<Badge variant="outline">Outline</Badge>);
    expect(container.querySelector("[data-slot='badge']")).toHaveClass("border-border");
  });
});
