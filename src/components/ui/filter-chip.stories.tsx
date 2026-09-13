import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { FilterChip } from "@/components/ui/filter-chip";

const meta = {
  title: "UI/FilterChip",
  component: FilterChip,
  tags: ["autodocs"],
  args: {
    label: "Diver",
    onRemove: fn(),
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongLabel: Story = {
  args: {
    label: "Automatic with exhibition caseback",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const PhoneWidth: Story = {
  args: {
    label: "40 mm",
  },
  render: (args) => (
    <div className="flex w-[390px] flex-wrap gap-2">
      <FilterChip {...args} />
      <FilterChip label="Pilot" onRemove={fn()} />
      <FilterChip label="Leather strap" onRemove={fn()} />
    </div>
  ),
};
