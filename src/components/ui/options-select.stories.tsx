import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Label } from "@/components/ui/label";
import { OptionsSelect } from "@/components/ui/options-select";

const movementOptions = [
  { value: "", label: "Not set" },
  { value: "nh35", label: "NH35" },
  { value: "nh36", label: "NH36" },
  { value: "nh34", label: "NH34" },
  { value: "miyota_8215", label: "Miyota 8215" },
  { value: "other", label: "Other" },
];

const meta = {
  title: "UI/OptionsSelect",
  component: OptionsSelect,
  tags: ["autodocs"],
  args: {
    options: movementOptions,
    value: "",
    onValueChange: fn(),
    placeholder: "Choose movement",
    id: "movement",
  },
  render: function OptionsSelectStory(args) {
    const [value, setValue] = useState(args.value);

    return (
      <div className="flex w-72 flex-col gap-2">
        <Label htmlFor={args.id}>Movement</Label>
        <OptionsSelect
          {...args}
          value={value}
          onValueChange={(next) => {
            setValue(next);
            args.onValueChange(next);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof OptionsSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unset: Story = {};

export const Selected: Story = {
  args: {
    value: "nh35",
  },
};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "nh35",
  },
};
