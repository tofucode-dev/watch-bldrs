import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookmarkIcon } from "lucide-react";
import { fn } from "storybook/test";

import { Button } from "@/components/ui/button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "Save draft",
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Cancel",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Publish",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Delete build",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Skip",
  },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "View catalog",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Icon: Story = {
  args: {
    size: "icon",
    "aria-label": "Save",
    children: <BookmarkIcon />,
  },
};
