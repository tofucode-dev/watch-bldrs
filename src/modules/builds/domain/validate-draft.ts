import { DraftValidationError } from "./errors";
import {
  isCurrencyCode,
  isDialColour,
  isHandsStyle,
  isMovement,
  isPartCategory,
  isStrapType,
  isWatchStyle,
} from "./options";
import type { DraftBuildInput, DraftPartInput, ValidatedDraft, ValidatedPart } from "./types";

export const NAME_MAX_LENGTH = 120;
export const STORY_MAX_LENGTH = 4000;
export const PART_NAME_MAX_LENGTH = 120;
export const PRODUCT_URL_MAX_LENGTH = 2048;
export const CASE_SIZE_MIN_MM = 20;
export const CASE_SIZE_MAX_MM = 70;
export const PRICE_AMOUNT_MINOR_MAX = 2_147_483_647;

// eslint-disable-next-line no-control-regex -- reject ASCII control characters in product URLs
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isBlankPart(part: DraftPartInput): boolean {
  return (
    normalizeOptionalText(part.category) === null &&
    normalizeOptionalText(part.name) === null &&
    normalizeOptionalText(part.productUrl) === null &&
    (part.priceAmountMinor === undefined || part.priceAmountMinor === null)
  );
}

function isAllowedProductUrl(value: string): boolean {
  if (value.length > PRODUCT_URL_MAX_LENGTH) {
    return false;
  }
  if (CONTROL_CHARS.test(value)) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return false;
  }
  return true;
}

function addFieldError(fields: Record<string, string>, key: string, message: string): void {
  if (!(key in fields)) {
    fields[key] = message;
  }
}

function validateEnumField<T extends string>(
  fields: Record<string, string>,
  key: string,
  raw: string | null | undefined,
  isAllowed: (value: string) => value is T,
  invalidMessage: string,
): T | null {
  const value = normalizeOptionalText(raw);
  if (value === null) {
    return null;
  }
  if (!isAllowed(value)) {
    addFieldError(fields, key, invalidMessage);
    return null;
  }
  return value;
}

function validatePart(
  part: DraftPartInput,
  formIndex: number,
  position: number,
  fields: Record<string, string>,
): ValidatedPart | null {
  const prefix = `parts.${formIndex}`;
  const categoryRaw = normalizeOptionalText(part.category);
  const name = normalizeOptionalText(part.name);
  const productUrl = normalizeOptionalText(part.productUrl);
  const currencyRaw = normalizeOptionalText(part.currency);
  const price = part.priceAmountMinor;

  if (categoryRaw === null || name === null) {
    addFieldError(fields, `${prefix}.category`, "Started parts need a category and name");
    addFieldError(fields, `${prefix}.name`, "Started parts need a category and name");
  }

  let category: ValidatedPart["category"] | null = null;
  if (categoryRaw !== null) {
    if (!isPartCategory(categoryRaw)) {
      addFieldError(fields, `${prefix}.category`, "Choose a valid part category");
    } else {
      category = categoryRaw;
    }
  }

  if (name !== null && name.length > PART_NAME_MAX_LENGTH) {
    addFieldError(fields, `${prefix}.name`, `Part name must be ${PART_NAME_MAX_LENGTH} characters or fewer`);
  }

  if (productUrl !== null && !isAllowedProductUrl(productUrl)) {
    addFieldError(fields, `${prefix}.productUrl`, "Enter an http or https product URL");
  }

  const hasPrice = price !== undefined && price !== null;
  const hasCurrency = currencyRaw !== null;
  if (hasPrice !== hasCurrency) {
    addFieldError(fields, `${prefix}.priceAmountMinor`, "Price and currency must both be set or both be empty");
    addFieldError(fields, `${prefix}.currency`, "Price and currency must both be set or both be empty");
  }

  let priceAmountMinor: number | null = null;
  if (hasPrice) {
    if (!Number.isInteger(price) || price < 0 || price > PRICE_AMOUNT_MINOR_MAX) {
      addFieldError(fields, `${prefix}.priceAmountMinor`, "Price must be a whole number of 0 or more");
    } else {
      priceAmountMinor = price;
    }
  }

  let currency: ValidatedPart["currency"] | null = null;
  if (hasCurrency) {
    if (!isCurrencyCode(currencyRaw)) {
      addFieldError(fields, `${prefix}.currency`, "Choose a supported currency");
    } else {
      currency = currencyRaw;
    }
  }

  if (
    category === null ||
    name === null ||
    name.length > PART_NAME_MAX_LENGTH ||
    (productUrl !== null && !isAllowedProductUrl(productUrl)) ||
    hasPrice !== hasCurrency ||
    (hasPrice && (!Number.isInteger(price) || price < 0 || price > PRICE_AMOUNT_MINOR_MAX)) ||
    (hasCurrency && !isCurrencyCode(currencyRaw))
  ) {
    return null;
  }

  return {
    category,
    name,
    productUrl,
    priceAmountMinor,
    currency,
    position,
  };
}

export function validateDraftInput(input: DraftBuildInput): ValidatedDraft {
  const fields: Record<string, string> = {};

  const name = normalizeOptionalText(input.name);
  if (name !== null && name.length > NAME_MAX_LENGTH) {
    addFieldError(fields, "name", `Name must be ${NAME_MAX_LENGTH} characters or fewer`);
  }

  const story = normalizeOptionalText(input.story);
  if (story !== null && story.length > STORY_MAX_LENGTH) {
    addFieldError(fields, "story", `Story must be ${STORY_MAX_LENGTH} characters or fewer`);
  }

  const watchStyle = validateEnumField(
    fields,
    "watchStyle",
    input.watchStyle,
    isWatchStyle,
    "Choose a valid watch style",
  );
  const movement = validateEnumField(fields, "movement", input.movement, isMovement, "Choose a valid movement");
  const dialColour = validateEnumField(
    fields,
    "dialColour",
    input.dialColour,
    isDialColour,
    "Choose a valid dial colour",
  );
  const strapType = validateEnumField(fields, "strapType", input.strapType, isStrapType, "Choose a valid strap type");
  const handsStyle = validateEnumField(
    fields,
    "handsStyle",
    input.handsStyle,
    isHandsStyle,
    "Choose a valid hands style",
  );

  let caseSizeMm: number | null = null;
  if (input.caseSizeMm !== undefined && input.caseSizeMm !== null) {
    if (
      !Number.isInteger(input.caseSizeMm) ||
      input.caseSizeMm < CASE_SIZE_MIN_MM ||
      input.caseSizeMm > CASE_SIZE_MAX_MM
    ) {
      addFieldError(fields, "caseSizeMm", `Case size must be between ${CASE_SIZE_MIN_MM} and ${CASE_SIZE_MAX_MM} mm`);
    } else {
      caseSizeMm = input.caseSizeMm;
    }
  }

  const rawParts = input.parts ?? [];
  const keptParts: ValidatedPart[] = [];
  for (let formIndex = 0; formIndex < rawParts.length; formIndex++) {
    const part = rawParts[formIndex];
    if (isBlankPart(part)) {
      continue;
    }
    const validated = validatePart(part, formIndex, keptParts.length, fields);
    if (validated) {
      keptParts.push(validated);
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new DraftValidationError(fields);
  }

  return {
    name,
    story,
    watchStyle,
    movement,
    dialColour,
    strapType,
    handsStyle,
    caseSizeMm,
    parts: keptParts,
  };
}
