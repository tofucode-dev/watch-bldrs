import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/ui/badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: {
    children: "NH35",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["neutral", "primary", "mustard", "olive", "field", "pilot", "outline"],
    },
  },
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: {
    variant: "neutral",
    children: "Automatic",
  },
};

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "GMT",
  },
};

export const Mustard: Story = {
  args: {
    variant: "mustard",
    children: "Dress",
  },
};

export const Olive: Story = {
  args: {
    variant: "olive",
    children: "NH35",
  },
};

export const Field: Story = {
  args: {
    variant: "field",
    children: "40mm",
  },
};

export const Pilot: Story = {
  args: {
    variant: "pilot",
    children: "Leather strap",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Integrated",
  },
};

export const MetadataRow: Story = {
  render: function MetadataBadges() {
    return (
      <div className="flex max-w-sm flex-wrap gap-2">
        <Badge variant="olive">NH35</Badge>
        <Badge variant="field">40mm</Badge>
        <Badge variant="mustard">Steel bracelet</Badge>
        <Badge variant="pilot">Blue dial</Badge>
      </div>
    );
  },
};

export const LongText: Story = {
  args: {
    variant: "neutral",
    children: "Extra-long metadata label for overflow inspection",
  },
};
