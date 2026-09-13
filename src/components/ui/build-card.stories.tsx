import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeartIcon } from "lucide-react";
import { fn } from "storybook/test";

import { Button } from "@/components/ui/button";
import { BuildCard } from "@/components/ui/build-card";

const FIXTURE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23d6cdbf' width='400' height='300'/%3E%3Ccircle cx='200' cy='150' r='72' fill='%23c1462e' opacity='0.35'/%3E%3C/svg%3E";

const meta = {
  title: "UI/BuildCard",
  component: BuildCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    href: "/builds/deepwater-explorer",
    name: "Deepwater Explorer",
    imageUrl: FIXTURE_IMAGE,
    imageWidth: 400,
    imageHeight: 300,
    styleLabel: "Diver",
    styleLabelTone: "olive",
    movement: "NH35",
    caseSizeMm: 40,
    strapType: "Steel bracelet",
    dialColour: "Black",
    likeCount: 12,
  },
} satisfies Meta<typeof BuildCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Complete: Story = {
  render: function CompleteBuildCard(args) {
    return (
      <div className="w-full max-w-sm">
        <BuildCard {...args} />
      </div>
    );
  },
};

export const Sparse: Story = {
  args: {
    name: null,
    imageUrl: null,
    styleLabel: null,
    movement: null,
    dialColour: null,
    strapType: null,
    caseSizeMm: null,
    likeCount: 0,
  },
  render: function SparseBuildCard(args) {
    return (
      <div className="w-full max-w-sm">
        <BuildCard {...args} />
      </div>
    );
  },
};

export const MissingImage: Story = {
  args: {
    imageUrl: null,
  },
};

export const Untitled: Story = {
  args: {
    name: null,
  },
};

export const NoTags: Story = {
  args: {
    movement: null,
    dialColour: null,
    strapType: null,
    caseSizeMm: null,
  },
};

export const MaximumLengthTitle: Story = {
  args: {
    name: "Custom Seiko SKX007 restomod with ceramic bezel insert, sapphire crystal, and hand-finished dial indices for daily wear",
  },
  render: function LongTitleBuildCard(args) {
    return (
      <div className="w-full max-w-sm">
        <BuildCard {...args} className="[&_[data-slot=card-title]]:line-clamp-2" />
      </div>
    );
  },
};

export const WithFooterAction: Story = {
  render: function BuildCardWithAction(args) {
    return (
      <div className="w-full max-w-sm">
        <BuildCard
          {...args}
          footerAction={
            <Button type="button" variant="ghost" size="icon" aria-label="Like build" onClick={fn()}>
              <HeartIcon />
            </Button>
          }
        />
      </div>
    );
  },
};

export const PaperTheme: Story = {
  parameters: {
    globals: {
      theme: "light",
    },
  },
};

export const InkTheme: Story = {
  parameters: {
    globals: {
      theme: "dark",
    },
  },
};
