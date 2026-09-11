import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OptionsSelect } from "@/components/ui/options-select";

const options = [
  { value: "", label: "Not set" },
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
];

afterEach(() => {
  cleanup();
});

describe("OptionsSelect", () => {
  it("renders the placeholder when unset", () => {
    render(
      <OptionsSelect options={options} value="" onValueChange={() => undefined} placeholder="Choose movement" />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("Choose movement");
  });

  it("renders the selected option label on the trigger", () => {
    render(
      <OptionsSelect
        options={options}
        value="automatic"
        onValueChange={() => undefined}
        placeholder="Choose movement"
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("Automatic");
  });

  it("passes id, aria-invalid, and disabled to the trigger", () => {
    render(
      <OptionsSelect
        id="movement"
        options={options}
        value="automatic"
        onValueChange={() => undefined}
        aria-invalid="true"
        disabled
      />,
    );

    const trigger = screen.getByRole("combobox");

    expect(trigger).toHaveAttribute("id", "movement");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toBeDisabled();
  });
});
