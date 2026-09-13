import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { FilterControls, type FilterDimension } from "@/components/ui/filter-controls";

const styleOptions = [
  { value: "", label: "All" },
  { value: "diver", label: "Diver" },
  { value: "dress", label: "Dress" },
  { value: "field", label: "Field" },
  { value: "pilot", label: "Pilot" },
];

const movementOptions = [
  { value: "", label: "All" },
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
  { value: "quartz", label: "Quartz" },
];

const dialColourOptions = [
  { value: "", label: "All" },
  { value: "black", label: "Black" },
  { value: "blue", label: "Blue" },
  { value: "white", label: "White" },
];

const strapTypeOptions = [
  { value: "", label: "All" },
  { value: "bracelet", label: "Bracelet" },
  { value: "leather", label: "Leather" },
  { value: "rubber", label: "Rubber" },
];

function caseSizeOptions(): { value: string; label: string }[] {
  const options = [{ value: "", label: "All" }];

  for (let millimeters = 20; millimeters <= 70; millimeters += 1) {
    options.push({ value: String(millimeters), label: `${String(millimeters)} mm` });
  }

  return options;
}

function createDimensions(values: Partial<Record<string, string>> = {}): FilterDimension[] {
  return [
    { id: "style", label: "Style", options: styleOptions, value: values.style ?? "" },
    { id: "movement", label: "Movement", options: movementOptions, value: values.movement ?? "" },
    { id: "dial-colour", label: "Dial colour", options: dialColourOptions, value: values["dial-colour"] ?? "" },
    { id: "strap-type", label: "Strap type", options: strapTypeOptions, value: values["strap-type"] ?? "" },
    { id: "case-size", label: "Case size", options: caseSizeOptions(), value: values["case-size"] ?? "" },
  ];
}

const onDimensionChangeSpy = fn();
const onClearAllSpy = fn();

function FilterControlsDemo({
  initialValues = {},
  widthClassName = "w-full max-w-6xl",
}: {
  initialValues?: Partial<Record<string, string>>;
  widthClassName?: string;
}) {
  const [dimensions, setDimensions] = useState(() => createDimensions(initialValues));

  return (
    <div className={widthClassName}>
      <FilterControls
        dimensions={dimensions}
        onDimensionChange={(id, value) => {
          setDimensions((current) =>
            current.map((dimension) => (dimension.id === id ? { ...dimension, value } : dimension)),
          );
          onDimensionChangeSpy(id, value);
        }}
        onClearAll={() => {
          setDimensions(createDimensions());
          onClearAllSpy();
        }}
      />
    </div>
  );
}

const meta = {
  title: "UI/FilterControls",
  component: FilterControls,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof FilterControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unfiltered: Story = {
  render: () => <FilterControlsDemo />,
};

export const OneActive: Story = {
  render: () => <FilterControlsDemo initialValues={{ style: "diver" }} />,
};

export const SeveralActive: Story = {
  render: () => (
    <FilterControlsDemo
      initialValues={{
        style: "pilot",
        movement: "automatic",
        "dial-colour": "blue",
        "case-size": "40",
      }}
    />
  ),
};

export const PhoneWidth: Story = {
  render: () => (
    <FilterControlsDemo
      initialValues={{
        style: "field",
        "strap-type": "leather",
        "case-size": "42",
      }}
      widthClassName="w-[390px]"
    />
  ),
};
