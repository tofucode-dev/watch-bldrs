import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { PhotoUpload, type PhotoUploadProps } from "@/components/ui/photo-upload";

const selectedJpeg = new ArrayBuffer(7);
new Uint8Array(selectedJpeg).set([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00]);
const selectedFile = new File([selectedJpeg], "main.jpg", { type: "image/jpeg" });

function StatefulPhotoUpload(props: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(props.file);

  return (
    <PhotoUpload
      {...props}
      file={file}
      onFileChange={(next) => {
        setFile(next);
        props.onFileChange(next);
      }}
    />
  );
}

const meta = {
  title: "UI/PhotoUpload",
  component: PhotoUpload,
  tags: ["autodocs"],
  args: {
    file: null,
    onFileChange: fn(),
  },
} satisfies Meta<typeof PhotoUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: function EmptyPhoto(args) {
    return (
      <Field>
        <FieldLabel htmlFor="main-photo-empty">Main photo</FieldLabel>
        <StatefulPhotoUpload {...args} id="main-photo-empty" />
      </Field>
    );
  },
};

export const Selected: Story = {
  args: {
    file: selectedFile,
  },
  render: function SelectedPhoto(args) {
    return (
      <Field>
        <FieldLabel htmlFor="main-photo-selected">Main photo</FieldLabel>
        <StatefulPhotoUpload {...args} id="main-photo-selected" />
      </Field>
    );
  },
};

export const Invalid: Story = {
  args: {
    error: "Could not save this image.",
  },
  render: function InvalidPhoto(args) {
    return (
      <Field data-invalid={true}>
        <FieldLabel htmlFor="main-photo-invalid">Main photo</FieldLabel>
        <StatefulPhotoUpload {...args} id="main-photo-invalid" />
        <FieldError>Could not save this image.</FieldError>
      </Field>
    );
  },
};

export const Phone: Story = {
  render: function PhonePhoto(args) {
    return (
      <div className="w-80">
        <Field>
          <FieldLabel htmlFor="main-photo-phone">Main photo</FieldLabel>
          <StatefulPhotoUpload {...args} id="main-photo-phone" />
        </Field>
      </div>
    );
  },
};
