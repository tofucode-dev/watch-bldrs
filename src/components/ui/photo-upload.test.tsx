import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PhotoUpload } from "@/components/ui/photo-upload";
import { MAIN_IMAGE_MAX_BYTES } from "@/lib/main-image-file";

const jpegBytes = [0xff, 0xd8, 0xff, 0xdb];
const pngBytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function fileFromBytes(bytes: number[], name: string, type: string): File {
  const payload = new ArrayBuffer(bytes.length);
  new Uint8Array(payload).set(bytes);
  return new File([payload], name, { type });
}

function jpegFile(name = "watch.jpg"): File {
  return fileFromBytes(jpegBytes, name, "image/jpeg");
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Expected a hidden file input");
  }
  return input;
}

function photoWell(container: HTMLElement): HTMLElement {
  const well = container.querySelector('[data-slot="photo-upload"]');
  if (!(well instanceof HTMLElement)) {
    throw new Error("Expected a photo-upload well");
  }
  return well;
}

const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

let createObjectURL: ReturnType<typeof vi.fn<(file: Blob) => string>>;
let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>;

beforeEach(() => {
  let objectUrlSeq = 0;
  createObjectURL = vi.fn(() => {
    objectUrlSeq += 1;
    return `blob:photo-upload-${String(objectUrlSeq)}`;
  });
  revokeObjectURL = vi.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: revokeObjectURL,
  });
});

afterEach(() => {
  cleanup();
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, "createObjectURL", originalCreateObjectURL);
  } else {
    Reflect.deleteProperty(URL, "createObjectURL");
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectURL);
  } else {
    Reflect.deleteProperty(URL, "revokeObjectURL");
  }
});

describe("PhotoUpload", () => {
  it("exposes Choose image and a hidden file input with the image accept list", () => {
    const { container } = render(<PhotoUpload file={null} onFileChange={vi.fn()} />);
    const input = fileInput(container);

    expect(screen.getByRole("button", { name: "Choose image" })).toBeInTheDocument();
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(input).toHaveClass("sr-only");
    expect(input.tabIndex).toBe(-1);
  });

  it("calls onFileChange with a valid File from the file input", async () => {
    const user = userEvent.setup();
    const onFileChange = vi.fn();
    const file = jpegFile();
    const { container } = render(<PhotoUpload file={null} onFileChange={onFileChange} />);

    await user.upload(fileInput(container), file);

    await waitFor(() => {
      expect(onFileChange).toHaveBeenCalledTimes(1);
    });
    expect(onFileChange).toHaveBeenCalledWith(file);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("calls onFileChange with a valid File from a drop", async () => {
    const onFileChange = vi.fn();
    const file = jpegFile("dropped.jpg");
    const { container } = render(<PhotoUpload file={null} onFileChange={onFileChange} />);

    fireEvent.drop(photoWell(container), {
      dataTransfer: { files: [file], types: ["Files"] },
    });

    await waitFor(() => {
      expect(onFileChange).toHaveBeenCalledWith(file);
    });
  });

  it("does not replace the current file when the pick is oversize and shows an alert", async () => {
    const user = userEvent.setup();
    const onFileChange = vi.fn();
    const current = jpegFile("current.jpg");
    const oversize = new File([new ArrayBuffer(MAIN_IMAGE_MAX_BYTES + 1)], "big.jpg", { type: "image/jpeg" });
    const { container } = render(<PhotoUpload file={current} onFileChange={onFileChange} />);

    await user.upload(fileInput(container), oversize);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(onFileChange).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Main photo preview" })).toBeInTheDocument();
  });

  it("does not replace the current file when the pick has a bad type and shows an alert", async () => {
    const user = userEvent.setup();
    const onFileChange = vi.fn();
    const current = jpegFile("current.jpg");
    const spoof = fileFromBytes(pngBytes, "spoof.jpg", "image/jpeg");
    const { container } = render(<PhotoUpload file={current} onFileChange={onFileChange} />);

    await user.upload(fileInput(container), spoof);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Use a JPEG, PNG, or WebP image.");
    });
    expect(onFileChange).not.toHaveBeenCalled();
  });

  it("renders a preview image when selected and Remove calls onFileChange(null)", async () => {
    const user = userEvent.setup();
    const onFileChange = vi.fn();
    render(<PhotoUpload file={jpegFile()} onFileChange={onFileChange} />);

    expect(screen.getByRole("img", { name: "Main photo preview" })).toHaveAttribute("src", "blob:photo-upload-1");

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onFileChange).toHaveBeenCalledWith(null);
  });

  it("sets aria-invalid from a parent error without adding a second role=alert", () => {
    const { container } = render(<PhotoUpload file={null} onFileChange={vi.fn()} error="Could not save this image." />);

    expect(photoWell(container)).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("revokes the object URL on unmount", () => {
    const { unmount } = render(<PhotoUpload file={jpegFile()} onFileChange={vi.fn()} />);

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:photo-upload-1");
  });
});
