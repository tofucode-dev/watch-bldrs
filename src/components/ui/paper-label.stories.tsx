import type { Meta, StoryObj } from "@storybook/react-vite";

import { PaperLabel } from "@/components/ui/paper-label";

const meta = {
  title: "UI/PaperLabel",
  component: PaperLabel,
  tags: ["autodocs"],
  args: {
    children: "Diver",
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["primary", "mustard", "olive", "field", "pilot"],
    },
    rotation: {
      control: "select",
      options: ["none", "slight", "left", "right"],
    },
  },
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof PaperLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    tone: "primary",
    children: "GMT",
  },
};

export const Mustard: Story = {
  args: {
    tone: "mustard",
    children: "Dress",
  },
};

export const Olive: Story = {
  args: {
    tone: "olive",
    children: "Diver",
  },
};

export const Field: Story = {
  args: {
    tone: "field",
    children: "Field",
  },
};

export const Pilot: Story = {
  args: {
    tone: "pilot",
    children: "Pilot",
  },
};

export const OverImage: Story = {
  render: function PaperLabelOverImage() {
    return (
      <div className="relative w-full max-w-sm">
        <div className="bg-muted aspect-[4/3] w-full" />
        <PaperLabel tone="olive" rotation="left" className="absolute top-3 left-3">
          Diver
        </PaperLabel>
      </div>
    );
  },
};

export const LongText: Story = {
  args: {
    tone: "field",
    children: "Extra-long style eyebrow label",
  },
};

export const RotationVariants: Story = {
  render: function PaperLabelRotations() {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <PaperLabel tone="primary" rotation="none">
          None
        </PaperLabel>
        <PaperLabel tone="mustard" rotation="slight">
          Slight
        </PaperLabel>
        <PaperLabel tone="olive" rotation="left">
          Left
        </PaperLabel>
        <PaperLabel tone="pilot" rotation="right">
          Right
        </PaperLabel>
      </div>
    );
  },
};
