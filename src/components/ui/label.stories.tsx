import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const meta = {
  title: "UI/Label",
  component: Label,
  tags: ["autodocs"],
  args: {
    children: "Build name",
    htmlFor: "build-name",
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInput: Story = {
  render: function LabelWithInput() {
    return (
      <div className="flex w-80 flex-col gap-2">
        <Label htmlFor="build-name">Build name</Label>
        <Input id="build-name" placeholder="Seiko SKX007 restomod" />
      </div>
    );
  },
};
