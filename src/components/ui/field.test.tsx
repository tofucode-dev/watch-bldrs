import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

afterEach(() => {
  cleanup();
});

describe("Field", () => {
  it("associates FieldLabel htmlFor with control id", () => {
    render(
      <Field>
        <FieldLabel htmlFor="build-name">Build name</FieldLabel>
        <Input id="build-name" type="text" />
      </Field>,
    );

    expect(screen.getByRole("textbox", { name: "Build name" })).toHaveAttribute("id", "build-name");
  });

  it("shows FieldError with role alert and aria-invalid on the control", () => {
    render(
      <Field data-invalid={true}>
        <FieldLabel htmlFor="build-name">Build name</FieldLabel>
        <Input id="build-name" type="text" aria-invalid="true" />
        <FieldError>Name is required</FieldError>
      </Field>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
    expect(screen.getByRole("textbox", { name: "Build name" })).toHaveAttribute("aria-invalid", "true");
  });

  it("renders FieldDescription for hints such as story counters", () => {
    render(
      <Field>
        <FieldLabel htmlFor="story">Story</FieldLabel>
        <Textarea id="story" />
        <FieldDescription>0 / 2000 characters</FieldDescription>
      </Field>,
    );

    expect(screen.getByText("0 / 2000 characters")).toBeInTheDocument();
  });

  it("passes through input types used by the build form", () => {
    render(
      <Field>
        <FieldLabel htmlFor="case-size">Case size</FieldLabel>
        <Input id="case-size" type="number" />
      </Field>,
    );

    expect(screen.getByLabelText("Case size")).toHaveAttribute("type", "number");
  });
});
