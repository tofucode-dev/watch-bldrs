import {
  CASE_SIZE_MAX_MM,
  CASE_SIZE_MIN_MM,
  isDialColour,
  isMovement,
  isStrapType,
  isWatchStyle,
} from "@/modules/builds";

import { InvalidCatalogFilterError } from "../domain/errors";

export interface CatalogFilters {
  watch_style?: string;
  movement?: string;
  dial_colour?: string;
  strap_type?: string;
  case_size_mm?: number;
}

function readEnumFilter(
  searchParams: URLSearchParams,
  key: string,
  isAllowed: (value: string) => boolean,
): string | undefined {
  const value = searchParams.get(key);
  if (value === null || value === "") {
    return undefined;
  }
  if (!isAllowed(value)) {
    throw new InvalidCatalogFilterError(`Invalid catalog filter: ${key}`);
  }
  return value;
}

export function parseCatalogFilterParams(searchParams: URLSearchParams): CatalogFilters {
  const filters: CatalogFilters = {};
  const watchStyle = readEnumFilter(searchParams, "watch_style", isWatchStyle);
  const movement = readEnumFilter(searchParams, "movement", isMovement);
  const dialColour = readEnumFilter(searchParams, "dial_colour", isDialColour);
  const strapType = readEnumFilter(searchParams, "strap_type", isStrapType);
  const caseSize = searchParams.get("case_size_mm");

  if (watchStyle !== undefined) {
    filters.watch_style = watchStyle;
  }
  if (movement !== undefined) {
    filters.movement = movement;
  }
  if (dialColour !== undefined) {
    filters.dial_colour = dialColour;
  }
  if (strapType !== undefined) {
    filters.strap_type = strapType;
  }

  if (caseSize !== null && caseSize !== "") {
    const caseSizeMm = Number(caseSize);
    if (!Number.isInteger(caseSizeMm) || caseSizeMm < CASE_SIZE_MIN_MM || caseSizeMm > CASE_SIZE_MAX_MM) {
      throw new InvalidCatalogFilterError("Invalid catalog filter: case_size_mm");
    }
    filters.case_size_mm = caseSizeMm;
  }

  return filters;
}

export function hasActiveCatalogFilters(filters: CatalogFilters): boolean {
  return Object.values(filters).some((value) => value !== undefined);
}
