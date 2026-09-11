import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "@/components/ui/input";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    placeholder: "Seiko SKX007 restomod",
    type: "text",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Number: Story = {
  args: {
    type: "number",
    placeholder: "40",
  },
};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
    defaultValue: "",
    placeholder: "Build name is required",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "SKX restomod",
  },
};
