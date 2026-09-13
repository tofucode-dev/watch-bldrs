import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ListingLoadMore } from "@/components/ui/listing-load-more";

const meta = {
  title: "UI/ListingLoadMore",
  component: ListingLoadMore,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof ListingLoadMore>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const EndOfList: Story = {
  args: {
    hasMore: false,
    endLabel: "No more builds to show",
  },
};

export const InkTheme: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
