import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { actions } from "astro:actions";

import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { MainImageUploadError, uploadMainImage } from "@/lib/upload-main-image";
import BuildForm from "@/modules/builds/presentation/build-form";

vi.mock("@/lib/upload-main-image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/upload-main-image")>();
  return {
    ...actual,
    uploadMainImage: vi.fn(),
  };
});

vi.mock("@/lib/supabase-browser", () => ({
  createBrowserSupabaseClient: vi.fn(() => null),
}));

const replaceState = vi.fn();
const AUTHOR_ID = "11111111-1111-4111-8111-111111111111";
const DRAFT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const IMAGE_PATH = `${AUTHOR_ID}/${DRAFT_ID}/main.jpg`;
const jpegBytes = [0xff, 0xd8, 0xff, 0xdb];

function jpegFile(name = "watch.jpg"): File {
  const payload = new ArrayBuffer(jpegBytes.length);
  new Uint8Array(payload).set(jpegBytes);
  return new File([payload], name, { type: "image/jpeg" });
}

function pngFile(name = "watch.png"): File {
  const bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const payload = new ArrayBuffer(bytes.length);
  new Uint8Array(payload).set(bytes);
  return new File([payload], name, { type: "image/png" });
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Expected a hidden file input");
  }
  return input;
}

function mockBrowserClient(userId = AUTHOR_ID) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
  };
}

function mockActionData(
  data: { ok: true; id: string } | { ok: false; error: "validation"; fields: Record<string, string> },
) {
  return { data, error: undefined };
}

const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

beforeEach(() => {
  vi.mocked(actions.builds.createDraft).mockReset();
  vi.mocked(actions.builds.update).mockReset();
  vi.mocked(actions.builds.attachMainImage).mockReset();
  vi.mocked(uploadMainImage).mockReset();
  vi.mocked(createBrowserSupabaseClient).mockReset();
  vi.mocked(createBrowserSupabaseClient).mockReturnValue(null);
  replaceState.mockReset();
  vi.stubGlobal("history", { replaceState });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => "blob:build-form-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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

describe("BuildForm", () => {
  it("sends createDraft on first save when there is no draft id", async () => {
    vi.mocked(actions.builds.createDraft).mockResolvedValue(mockActionData({ ok: true, id: "draft-1" }));
    const user = userEvent.setup();

    render(<BuildForm />);

    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(actions.builds.createDraft).toHaveBeenCalledOnce();
    });
    expect(actions.builds.update).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/account/builds/draft-1/edit");
  });

  it("does not create two drafts when Save is clicked twice before the first save settles", async () => {
    let resolveCreate: (value: ReturnType<typeof mockActionData>) => void = () => {
      /* assigned below */
    };
    vi.mocked(actions.builds.createDraft).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );

    render(<BuildForm />);
    const saveButton = screen.getByRole("button", { name: "Save Draft" });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(actions.builds.createDraft).toHaveBeenCalledOnce();

    resolveCreate(mockActionData({ ok: true, id: "draft-1" }));
    await waitFor(() => {
      expect(screen.getByText("Draft saved")).toBeInTheDocument();
    });
  });

  it("sends update on second save after create succeeds", async () => {
    vi.mocked(actions.builds.createDraft).mockResolvedValue(mockActionData({ ok: true, id: "draft-1" }));
    vi.mocked(actions.builds.update).mockResolvedValue(mockActionData({ ok: true, id: "draft-1" }));
    const user = userEvent.setup();

    render(<BuildForm />);

    await user.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => {
      expect(actions.builds.createDraft).toHaveBeenCalledOnce();
    });

    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(actions.builds.update).toHaveBeenCalledWith(expect.objectContaining({ id: "draft-1" }));
    });
  });

  it("restores the last saved snapshot when Discard is clicked", async () => {
    vi.mocked(actions.builds.createDraft).mockResolvedValue(mockActionData({ ok: true, id: "draft-1" }));
    const user = userEvent.setup();

    render(<BuildForm />);

    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "Saved name");
    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Draft saved")).toBeInTheDocument();
    });

    await user.clear(nameInput);
    await user.type(nameInput, "Dirty name");
    expect(nameInput).toHaveValue("Dirty name");

    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(nameInput).toHaveValue("Saved name");
  });

  it("shows validation errors and preserves submitted values", async () => {
    vi.mocked(actions.builds.createDraft).mockResolvedValue(
      mockActionData({
        ok: false,
        error: "validation",
        fields: {
          caseSizeMm: "Case size must be between 20 and 70 mm",
        },
      }),
    );
    const user = userEvent.setup();

    render(<BuildForm />);

    const caseSizeInput = screen.getByLabelText("Case size (mm)");
    await user.type(caseSizeInput, "19");
    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Case size must be between 20 and 70 mm")).toBeInTheDocument();
    });
    expect(caseSizeInput).toHaveValue(19);
  });

  it("shows a price format error and does not call createDraft", async () => {
    const user = userEvent.setup();

    render(<BuildForm />);
    await user.click(screen.getByRole("button", { name: "Add part" }));
    await user.type(screen.getByLabelText("Price"), "19.999");
    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Enter a price with up to two decimal places")).toBeInTheDocument();
    });
    expect(actions.builds.createDraft).not.toHaveBeenCalled();
  });

  it("shows part row validation messages under the invalid fields", async () => {
    vi.mocked(actions.builds.createDraft).mockResolvedValue(
      mockActionData({
        ok: false,
        error: "validation",
        fields: {
          "parts.0.category": "Started parts need a category and name",
          "parts.0.name": "Started parts need a category and name",
          "parts.0.priceAmountMinor": "Price and currency must both be set or both be empty",
          "parts.0.currency": "Price and currency must both be set or both be empty",
        },
      }),
    );
    const user = userEvent.setup();

    render(<BuildForm />);

    await user.click(screen.getByRole("button", { name: "Add part" }));
    const priceInput = screen.getByLabelText("Price");
    await user.type(priceInput, "50");
    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(screen.getAllByText("Started parts need a category and name")).toHaveLength(1);
      expect(screen.getAllByText("Price and currency must both be set or both be empty")).toHaveLength(1);
    });
  });

  it("appends a part row when Add part is clicked", async () => {
    const user = userEvent.setup();

    render(<BuildForm />);

    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add part" }));

    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Product URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Price")).toBeInTheDocument();
  });

  it("loads an existing draft id and saves with update", async () => {
    vi.mocked(actions.builds.update).mockResolvedValue(mockActionData({ ok: true, id: "existing-draft" }));
    const user = userEvent.setup();

    render(
      <BuildForm
        initialDraft={{
          id: "existing-draft",
          name: "Loaded draft",
          story: null,
          watchStyle: null,
          movement: null,
          dialColour: null,
          strapType: null,
          handsStyle: null,
          caseSizeMm: null,
          parts: [],
        }}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Loaded draft");

    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(actions.builds.update).toHaveBeenCalledWith(expect.objectContaining({ id: "existing-draft" }));
    });
    expect(actions.builds.createDraft).not.toHaveBeenCalled();
  });

  it("uploads then attaches when Save is clicked with a File", async () => {
    vi.mocked(actions.builds.createDraft).mockResolvedValue(mockActionData({ ok: true, id: DRAFT_ID }));
    vi.mocked(actions.builds.attachMainImage).mockResolvedValue(mockActionData({ ok: true, id: DRAFT_ID }));
    vi.mocked(createBrowserSupabaseClient).mockReturnValue(
      mockBrowserClient() as unknown as ReturnType<typeof createBrowserSupabaseClient>,
    );
    vi.mocked(uploadMainImage).mockResolvedValue({ path: IMAGE_PATH });
    const user = userEvent.setup();
    const file = jpegFile();

    const { container } = render(<BuildForm />);
    await user.upload(fileInput(container), file);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Main photo preview" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(uploadMainImage).toHaveBeenCalledOnce();
    });
    expect(actions.builds.createDraft).toHaveBeenCalledOnce();
    expect(uploadMainImage).toHaveBeenCalledWith(
      expect.objectContaining({
        file,
        authorId: AUTHOR_ID,
        buildId: DRAFT_ID,
      }),
    );
    expect(vi.mocked(actions.builds.attachMainImage)).toHaveBeenCalledWith({ id: DRAFT_ID, path: IMAGE_PATH });
  });

  it("passes previousPath when replacing a saved image with a different type", async () => {
    const pngPath = `${AUTHOR_ID}/${DRAFT_ID}/main.png`;
    vi.mocked(actions.builds.createDraft).mockResolvedValue(mockActionData({ ok: true, id: DRAFT_ID }));
    vi.mocked(actions.builds.update).mockResolvedValue(mockActionData({ ok: true, id: DRAFT_ID }));
    vi.mocked(actions.builds.attachMainImage).mockResolvedValue(mockActionData({ ok: true, id: DRAFT_ID }));
    vi.mocked(createBrowserSupabaseClient).mockReturnValue(
      mockBrowserClient() as unknown as ReturnType<typeof createBrowserSupabaseClient>,
    );
    vi.mocked(uploadMainImage).mockResolvedValueOnce({ path: IMAGE_PATH }).mockResolvedValueOnce({ path: pngPath });
    const user = userEvent.setup();

    const { container } = render(<BuildForm />);
    await user.upload(fileInput(container), jpegFile());
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Main photo preview" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => {
      expect(screen.getByText("Draft saved")).toBeInTheDocument();
    });

    await user.upload(fileInput(container), pngFile());
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Main photo preview" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(uploadMainImage).toHaveBeenCalledTimes(2);
    });
    expect(uploadMainImage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        previousPath: IMAGE_PATH,
        buildId: DRAFT_ID,
      }),
    );
    expect(vi.mocked(actions.builds.attachMainImage)).toHaveBeenLastCalledWith({ id: DRAFT_ID, path: pngPath });
  });

  it("does not upload when Save is clicked with no File", async () => {
    vi.mocked(actions.builds.createDraft).mockResolvedValue(mockActionData({ ok: true, id: DRAFT_ID }));
    const user = userEvent.setup();

    render(<BuildForm />);
    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Draft saved")).toBeInTheDocument();
    });
    expect(uploadMainImage).not.toHaveBeenCalled();
    expect(actions.builds.attachMainImage).not.toHaveBeenCalled();
  });

  it("surfaces an upload helper error and does not attach a path", async () => {
    vi.mocked(actions.builds.createDraft).mockResolvedValue(mockActionData({ ok: true, id: DRAFT_ID }));
    vi.mocked(createBrowserSupabaseClient).mockReturnValue(
      mockBrowserClient() as unknown as ReturnType<typeof createBrowserSupabaseClient>,
    );
    vi.mocked(uploadMainImage).mockRejectedValue(new MainImageUploadError("storage"));
    const user = userEvent.setup();

    const { container } = render(<BuildForm />);
    await user.upload(fileInput(container), jpegFile());
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Main photo preview" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(screen.getByText("Draft saved, but the photo could not be uploaded.")).toBeInTheDocument();
    });
    expect(actions.builds.createDraft).toHaveBeenCalledOnce();
    expect(actions.builds.attachMainImage).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, "", `/account/builds/${DRAFT_ID}/edit`);
  });

  it("clears the stored path on save without uploading or deleting storage", async () => {
    vi.mocked(actions.builds.update).mockResolvedValue(mockActionData({ ok: true, id: DRAFT_ID }));
    vi.mocked(actions.builds.attachMainImage).mockResolvedValue(mockActionData({ ok: true, id: DRAFT_ID }));
    const user = userEvent.setup();

    render(
      <BuildForm
        initialDraft={{
          id: DRAFT_ID,
          name: "Loaded draft",
          story: null,
          watchStyle: null,
          movement: null,
          dialColour: null,
          strapType: null,
          handsStyle: null,
          caseSizeMm: null,
          mainImagePath: IMAGE_PATH,
          mainImageUrl: "https://example.test/signed-main.jpg",
          parts: [],
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "Main photo preview" })).toHaveAttribute(
      "src",
      "https://example.test/signed-main.jpg",
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(actions.builds.attachMainImage).toHaveBeenCalledWith({ id: DRAFT_ID, path: null });
    });
    expect(uploadMainImage).not.toHaveBeenCalled();
    expect(actions.builds.createDraft).not.toHaveBeenCalled();
  });
});
