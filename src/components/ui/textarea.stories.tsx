import type { Meta, StoryObj } from "@storybook/react-vite";

import { Textarea } from "@/components/ui/textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: {
    placeholder: "How the build came together…",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
    placeholder: "Story is too long",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "NH35 swap with a chapter ring and a tropic strap.",
  },
};
