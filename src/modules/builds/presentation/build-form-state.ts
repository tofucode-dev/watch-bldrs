import type { DraftBuildInput, DraftPartInput } from "../domain/types";
import { PRICE_AMOUNT_MINOR_MAX } from "../domain/validate-draft";
import type { BuildFormInitialDraft } from "./build-form-types";
import { formatMinorUnitsToPrice, parsePriceToMinorUnits } from "./form-price";

export interface PartRowState {
  key: string;
  category: string;
  name: string;
  productUrl: string;
  price: string;
  currency: string;
}

export interface BuildFormState {
  name: string;
  story: string;
  watchStyle: string;
  movement: string;
  dialColour: string;
  strapType: string;
  handsStyle: string;
  caseSizeMm: string;
  parts: PartRowState[];
}

export function emptyFormState(): BuildFormState {
  return {
    name: "",
    story: "",
    watchStyle: "",
    movement: "",
    dialColour: "",
    strapType: "",
    handsStyle: "",
    caseSizeMm: "",
    parts: [],
  };
}

export function formStateFromInitialDraft(draft: BuildFormInitialDraft): BuildFormState {
  return {
    name: draft.name ?? "",
    story: draft.story ?? "",
    watchStyle: draft.watchStyle ?? "",
    movement: draft.movement ?? "",
    dialColour: draft.dialColour ?? "",
    strapType: draft.strapType ?? "",
    handsStyle: draft.handsStyle ?? "",
    caseSizeMm: draft.caseSizeMm !== null ? String(draft.caseSizeMm) : "",
    parts: draft.parts.map((part) => ({
      key: crypto.randomUUID(),
      category: part.category,
      name: part.name,
      productUrl: part.productUrl ?? "",
      price: formatMinorUnitsToPrice(part.priceAmountMinor),
      currency: part.currency ?? "",
    })),
  };
}

function isBlankPartRow(part: PartRowState): boolean {
  return (
    part.category.trim() === "" &&
    part.name.trim() === "" &&
    part.productUrl.trim() === "" &&
    part.price.trim() === "" &&
    part.currency.trim() === ""
  );
}

export function formPriceFieldErrors(state: BuildFormState): Record<string, string> {
  const fields: Record<string, string> = {};
  state.parts.forEach((row, index) => {
    if (isBlankPartRow(row) || row.price.trim() === "") {
      return;
    }
    const priceMinor = parsePriceToMinorUnits(row.price);
    if (priceMinor === null || Number.isNaN(priceMinor)) {
      fields[`parts.${index}.priceAmountMinor`] = "Enter a price with up to two decimal places";
      return;
    }
    if (priceMinor > PRICE_AMOUNT_MINOR_MAX) {
      fields[`parts.${index}.priceAmountMinor`] = "Price must be a whole number of 0 or more";
    }
  });
  return fields;
}

export function formStateToDraftInput(state: BuildFormState): DraftBuildInput {
  const caseSizeRaw = state.caseSizeMm.trim();
  let caseSizeMm: number | null = null;
  if (caseSizeRaw !== "") {
    const parsed = Number.parseInt(caseSizeRaw, 10);
    caseSizeMm = Number.isNaN(parsed) ? null : parsed;
  }

  const parts: DraftPartInput[] = [];
  for (const row of state.parts) {
    if (isBlankPartRow(row)) {
      continue;
    }
    const priceMinor = parsePriceToMinorUnits(row.price);
    parts.push({
      category: row.category.trim() === "" ? null : row.category,
      name: row.name.trim() === "" ? null : row.name,
      productUrl: row.productUrl.trim() === "" ? null : row.productUrl,
      priceAmountMinor: priceMinor === null || Number.isNaN(priceMinor) ? null : priceMinor,
      currency: row.currency.trim() === "" ? null : row.currency,
    });
  }

  return {
    name: state.name.trim() === "" ? null : state.name,
    story: state.story.trim() === "" ? null : state.story,
    watchStyle: state.watchStyle === "" ? null : state.watchStyle,
    movement: state.movement === "" ? null : state.movement,
    dialColour: state.dialColour === "" ? null : state.dialColour,
    strapType: state.strapType === "" ? null : state.strapType,
    handsStyle: state.handsStyle === "" ? null : state.handsStyle,
    caseSizeMm,
    parts,
  };
}
