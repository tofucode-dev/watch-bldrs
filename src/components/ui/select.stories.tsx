import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const movementOptions = [
  { value: "nh35", label: "NH35" },
  { value: "nh36", label: "NH36" },
  { value: "nh34", label: "NH34" },
  { value: "miyota_8215", label: "Miyota 8215" },
  { value: "other", label: "Other" },
];

const meta = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Radix Select primitives. Use OptionsSelect when an option value may be empty (Radix forbids empty item values).",
      },
    },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

function MovementSelect({ disabled = false, invalid = false }: { disabled?: boolean; invalid?: boolean }) {
  const [value, setValue] = useState("nh35");

  return (
    <Select value={value} onValueChange={setValue} disabled={disabled}>
      <SelectTrigger className="w-72" aria-invalid={invalid || undefined}>
        <SelectValue placeholder="Choose movement" />
      </SelectTrigger>
      <SelectContent>
        {movementOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const Default: Story = {
  render: function DefaultSelect() {
    return <MovementSelect />;
  },
};

export const Invalid: Story = {
  render: function InvalidSelect() {
    return <MovementSelect invalid />;
  },
};

export const Disabled: Story = {
  render: function DisabledSelect() {
    return <MovementSelect disabled />;
  },
};
