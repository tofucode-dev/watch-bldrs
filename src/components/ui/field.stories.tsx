import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OptionsSelect } from "@/components/ui/options-select";
import { Textarea } from "@/components/ui/textarea";

const movementOptions = [
  { value: "", label: "Not set" },
  { value: "nh35", label: "NH35" },
  { value: "nh36", label: "NH36" },
  { value: "nh34", label: "NH34" },
  { value: "miyota_8215", label: "Miyota 8215" },
  { value: "other", label: "Other" },
];

const meta = {
  title: "UI/Field",
  component: Field,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultField() {
    return (
      <Field>
        <FieldLabel htmlFor="build-name">Build name</FieldLabel>
        <Input id="build-name" placeholder="Seiko SKX007 restomod" />
      </Field>
    );
  },
};

export const Invalid: Story = {
  render: function InvalidField() {
    return (
      <Field data-invalid={true}>
        <FieldLabel htmlFor="build-name-invalid">Build name</FieldLabel>
        <Input id="build-name-invalid" aria-invalid="true" />
        <FieldError>Name is required</FieldError>
      </Field>
    );
  },
};

export const Description: Story = {
  render: function DescriptionField() {
    return (
      <Field>
        <FieldLabel htmlFor="story">Story</FieldLabel>
        <Textarea id="story" placeholder="How the build came together…" />
        <FieldDescription>0 / 2000 characters</FieldDescription>
      </Field>
    );
  },
};

export const Number: Story = {
  render: function NumberField() {
    return (
      <Field>
        <FieldLabel htmlFor="case-size">Case size</FieldLabel>
        <Input id="case-size" type="number" placeholder="40" />
        <FieldDescription>Millimetres</FieldDescription>
      </Field>
    );
  },
};

export const WithSelect: Story = {
  render: function SelectField() {
    const [value, setValue] = useState("");

    return (
      <Field>
        <FieldLabel htmlFor="movement">Movement</FieldLabel>
        <OptionsSelect
          id="movement"
          options={movementOptions}
          value={value}
          onValueChange={setValue}
          placeholder="Choose movement"
        />
      </Field>
    );
  },
};
