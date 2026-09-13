import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { BuildCard } from "@/components/ui/build-card";
import { BuildGrid } from "@/components/ui/build-grid";
import { ListingLoadMore } from "@/components/ui/listing-load-more";

const FIXTURE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23d6cdbf' width='400' height='300'/%3E%3Ccircle cx='200' cy='150' r='72' fill='%23c1462e' opacity='0.35'/%3E%3C/svg%3E";

function fixtureCard(id: string, name: string, overrides: Partial<ComponentProps<typeof BuildCard>> = {}) {
  return (
    <BuildCard
      href={`/builds/${id}`}
      name={name}
      imageUrl={FIXTURE_IMAGE}
      imageWidth={400}
      imageHeight={300}
      styleLabel="Diver"
      movement="NH35"
      caseSizeMm={40}
      strapType="Steel bracelet"
      likeCount={12}
      {...overrides}
    />
  );
}

const meta = {
  title: "UI/BuildGrid",
  component: BuildGrid,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof BuildGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneCard: Story = {
  render: function OneCardGrid() {
    return (
      <div className="w-full max-w-6xl">
        <BuildGrid>{fixtureCard("one", "Deepwater Explorer")}</BuildGrid>
      </div>
    );
  },
};

export const TwoCards: Story = {
  render: function TwoCardGrid() {
    return (
      <div className="w-full max-w-6xl">
        <BuildGrid>
          {fixtureCard("first", "Deepwater Explorer")}
          {fixtureCard("second", "Field chronograph")}
        </BuildGrid>
      </div>
    );
  },
};

export const MultipleCards: Story = {
  render: function MultipleCardGrid() {
    return (
      <div className="w-full max-w-6xl">
        <BuildGrid>
          {fixtureCard("alpha", "Alpha build")}
          {fixtureCard("beta", "Beta build")}
          {fixtureCard("gamma", "Gamma build")}
          {fixtureCard("delta", "Delta build")}
          {fixtureCard("epsilon", "Epsilon build")}
          {fixtureCard("zeta", "Zeta build")}
        </BuildGrid>
      </div>
    );
  },
};

export const PhoneWidth: Story = {
  render: function PhoneGrid() {
    return (
      <div className="w-80">
        <BuildGrid>
          {fixtureCard("phone-1", "Phone build one")}
          {fixtureCard("phone-2", "Phone build two")}
        </BuildGrid>
      </div>
    );
  },
};

export const WideThreeColumn: Story = {
  parameters: {
    layout: "fullscreen",
  },
  render: function WideGrid() {
    return (
      <div className="w-full max-w-6xl p-6">
        <BuildGrid>
          {fixtureCard("wide-1", "Wide column one")}
          {fixtureCard("wide-2", "Wide column two")}
          {fixtureCard("wide-3", "Wide column three")}
        </BuildGrid>
      </div>
    );
  },
};

export const SparseCards: Story = {
  render: function SparseGrid() {
    return (
      <div className="w-full max-w-6xl">
        <BuildGrid>
          <BuildCard href="/builds/sparse-1" likeCount={0} />
          <BuildCard href="/builds/sparse-2" name={null} imageUrl={null} likeCount={1} />
        </BuildGrid>
      </div>
    );
  },
};

export const PreservedSourceOrder: Story = {
  render: function OrderedGrid() {
    return (
      <div className="w-full max-w-6xl">
        <BuildGrid>
          {fixtureCard("order-3", "Third in source")}
          {fixtureCard("order-1", "First in source")}
          {fixtureCard("order-2", "Second in source")}
        </BuildGrid>
      </div>
    );
  },
};

export const WithLoadMore: Story = {
  render: function GridWithLoadMore() {
    return (
      <div className="flex w-full max-w-6xl flex-col gap-4">
        <BuildGrid>
          {fixtureCard("grid-1", "Grid build one")}
          {fixtureCard("grid-2", "Grid build two")}
          {fixtureCard("grid-3", "Grid build three")}
        </BuildGrid>
        <ListingLoadMore />
      </div>
    );
  },
};
