import type { Meta, StoryObj } from "@storybook/react-vite";
import { TrashIcon } from "lucide-react";
import { fn } from "storybook/test";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PartsListHeader, PartsRow } from "@/components/ui/parts-row";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";

const meta = {
  title: "UI/StickyActionBar",
  component: StickyActionBar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof StickyActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    status: "Nothing saved yet",
    secondary: (
      <Button type="button" variant="outline" onClick={fn()}>
        Discard
      </Button>
    ),
    primary: (
      <Button type="button" onClick={fn()}>
        Save Draft
      </Button>
    ),
  },
};

export const OnTallPage: Story = {
  args: {
    status: "Nothing saved yet",
  },
  render: function TallPageBar() {
    return (
      <div className="flex min-h-[160vh] flex-col">
        <div className="text-muted-foreground flex-1 p-6 text-sm">Scroll to keep the sticky bar in view.</div>
        <StickyActionBar
          status="Nothing saved yet"
          secondary={
            <Button type="button" variant="outline" onClick={fn()}>
              Discard
            </Button>
          }
          primary={
            <Button type="button" onClick={fn()}>
              Save Draft
            </Button>
          }
        />
      </div>
    );
  },
};

export const WithPartsList: Story = {
  args: {
    status: "Nothing saved yet",
  },
  render: function PartsListWithBar() {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col gap-3 p-6">
          <PartsListHeader columns={["Category", "Name", "Product URL", "Price", "Currency"]} />
          <PartsRow
            index={1}
            cells={[
              {
                label: "Category",
                htmlFor: "bar-category",
                control: <Input id="bar-category" placeholder="Select category" />,
              },
              {
                label: "Name",
                htmlFor: "bar-name",
                control: <Input id="bar-name" placeholder="e.g. Explorer Dial" />,
              },
              {
                label: "Product URL",
                htmlFor: "bar-url",
                control: <Input id="bar-url" type="url" placeholder="https://" />,
              },
              {
                label: "Price",
                htmlFor: "bar-price",
                control: <Input id="bar-price" type="number" placeholder="0.00" />,
              },
              {
                label: "Currency",
                htmlFor: "bar-currency",
                control: <Input id="bar-currency" placeholder="USD" />,
              },
            ]}
            action={
              <Button type="button" variant="ghost" size="icon" aria-label="Remove part" onClick={fn()}>
                <TrashIcon />
              </Button>
            }
          />
        </div>
        <StickyActionBar
          status="Nothing saved yet"
          secondary={
            <Button type="button" variant="outline" onClick={fn()}>
              Discard
            </Button>
          }
          primary={
            <Button type="button" onClick={fn()}>
              Save Draft
            </Button>
          }
        />
      </div>
    );
  },
};
