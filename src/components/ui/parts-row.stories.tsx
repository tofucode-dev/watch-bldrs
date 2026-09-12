import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { TrashIcon } from "lucide-react";
import { fn } from "storybook/test";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionsSelect } from "@/components/ui/options-select";
import { PartsListHeader, PartsRow, type PartsRowCell } from "@/components/ui/parts-row";

const categoryOptions = [
  { value: "", label: "Select category" },
  { value: "dial", label: "Dial" },
  { value: "movement", label: "Movement" },
  { value: "case", label: "Case" },
];

const currencyOptions = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
];

const partColumns = ["Category", "Name", "Product URL", "Price", "Currency"];

function CategoryCell({ id }: { id: string }) {
  const [value, setValue] = useState("");

  return (
    <OptionsSelect
      id={id}
      options={categoryOptions}
      value={value}
      onValueChange={setValue}
      placeholder="Select category"
    />
  );
}

function CurrencyCell({ id }: { id: string }) {
  const [value, setValue] = useState("USD");

  return <OptionsSelect id={id} options={currencyOptions} value={value} onValueChange={setValue} />;
}

function dummyCells(idPrefix: string, namePlaceholder: string): PartsRowCell[] {
  return [
    {
      label: "Category",
      htmlFor: `${idPrefix}-category`,
      control: <CategoryCell id={`${idPrefix}-category`} />,
    },
    {
      label: "Name",
      htmlFor: `${idPrefix}-name`,
      control: <Input id={`${idPrefix}-name`} placeholder={namePlaceholder} />,
    },
    {
      label: "Product URL",
      htmlFor: `${idPrefix}-url`,
      control: <Input id={`${idPrefix}-url`} type="url" placeholder="https://" />,
    },
    {
      label: "Price",
      htmlFor: `${idPrefix}-price`,
      control: <Input id={`${idPrefix}-price`} type="number" placeholder="0.00" />,
    },
    { label: "Currency", htmlFor: `${idPrefix}-currency`, control: <CurrencyCell id={`${idPrefix}-currency`} /> },
  ];
}

function RemovePartButton({ label }: { label: string }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={fn()}>
      <TrashIcon />
    </Button>
  );
}

const meta = {
  title: "UI/PartsRow",
  component: PartsRow,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof PartsRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    index: 1,
    cells: dummyCells("part-1", "e.g. Explorer Dial"),
  },
  render: function DefaultPartsRow() {
    return (
      <div className="w-full max-w-5xl">
        <PartsRow
          index={1}
          cells={dummyCells("part-1", "e.g. Explorer Dial")}
          action={<RemovePartButton label="Remove part" />}
        />
      </div>
    );
  },
};

export const WithHeader: Story = {
  args: {
    index: 1,
    cells: dummyCells("header-1", "e.g. Explorer Dial"),
  },
  render: function HeaderPartsList() {
    return (
      <div className="flex w-full max-w-5xl flex-col gap-3">
        <PartsListHeader columns={partColumns} />
        <PartsRow
          index={1}
          cells={dummyCells("header-1", "e.g. Explorer Dial")}
          action={<RemovePartButton label="Remove part 1" />}
        />
        <PartsRow
          index={2}
          cells={dummyCells("header-2", "e.g. Explorer Dial")}
          action={<RemovePartButton label="Remove part 2" />}
        />
        <Button type="button" variant="outline" className="self-start" onClick={fn()}>
          Add part
        </Button>
      </div>
    );
  },
};

export const PhoneStacked: Story = {
  args: {
    index: 1,
    cells: dummyCells("phone-1", "e.g. Explorer Dial"),
  },
  render: function PhonePartsList() {
    return (
      <div className="flex w-80 flex-col gap-4">
        <PartsListHeader columns={partColumns} />
        <PartsRow
          index={1}
          cells={dummyCells("phone-1", "e.g. Explorer Dial")}
          action={<RemovePartButton label="Remove part 1" />}
        />
        <PartsRow
          index={2}
          cells={dummyCells("phone-2", "e.g. Explorer Dial")}
          action={<RemovePartButton label="Remove part 2" />}
        />
      </div>
    );
  },
};
