import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { actions } from "astro:actions";

import BuildForm from "@/modules/builds/presentation/build-form";

const replaceState = vi.fn();

function mockActionData(
  data: { ok: true; id: string } | { ok: false; error: "validation"; fields: Record<string, string> },
) {
  return { data, error: undefined };
}

beforeEach(() => {
  vi.mocked(actions.builds.createDraft).mockReset();
  vi.mocked(actions.builds.update).mockReset();
  replaceState.mockReset();
  vi.stubGlobal("history", { replaceState });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
});
