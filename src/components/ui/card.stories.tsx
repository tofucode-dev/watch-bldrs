import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PaperLabel } from "@/components/ui/paper-label";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultCard() {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Deepwater Explorer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="bg-muted aspect-[4/3] w-full" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="olive">NH35</Badge>
            <Badge variant="field">40mm</Badge>
            <Badge variant="mustard">Steel bracelet</Badge>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <span className="text-muted-foreground text-sm">12 likes</span>
          <Button type="button" variant="ghost" size="sm">
            Save
          </Button>
        </CardFooter>
      </Card>
    );
  },
};

export const WithPaperLabel: Story = {
  render: function CardWithPaperLabel() {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="relative p-0">
          <div className="relative">
            <div className="bg-muted aspect-[4/3] w-full" />
            <PaperLabel tone="olive" className="absolute top-3 left-3">
              Diver
            </PaperLabel>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <CardTitle>Field chronograph</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="olive">PT5000</Badge>
              <Badge variant="field">38mm</Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <span className="text-muted-foreground text-sm">4 likes</span>
        </CardFooter>
      </Card>
    );
  },
};

export const LongTitle: Story = {
  render: function CardWithLongTitle() {
    const longTitle =
      "Custom Seiko SKX007 restomod with ceramic bezel insert, sapphire crystal, and hand-finished dial indices for daily wear";

    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="line-clamp-2">{longTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted aspect-[4/3] w-full" />
        </CardContent>
      </Card>
    );
  },
};
