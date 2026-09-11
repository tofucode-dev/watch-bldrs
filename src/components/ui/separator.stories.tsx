import type { Meta, StoryObj } from "@storybook/react-vite";

import { Separator } from "@/components/ui/separator";

const meta = {
  title: "UI/Separator",
  component: Separator,
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: function HorizontalSeparator() {
    return (
      <div className="w-80">
        <p className="text-sm">Watch attributes</p>
        <Separator className="my-3" />
        <p className="text-sm">Parts list</p>
      </div>
    );
  },
};

export const Vertical: Story = {
  render: function VerticalSeparator() {
    return (
      <div className="flex h-8 items-center gap-3">
        <span className="text-sm">Draft</span>
        <Separator orientation="vertical" />
        <span className="text-sm">Published</span>
      </div>
    );
  },
};
