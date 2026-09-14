import type { CatalogFilters } from "./catalog-filters";

export type CatalogListingPagination =
  { kind: "first" } | { kind: "after"; cursor: string } | { kind: "before"; cursor: string };

const FILTER_PARAM_ORDER: (keyof CatalogFilters)[] = [
  "watch_style",
  "movement",
  "dial_colour",
  "strap_type",
  "case_size_mm",
];

export function buildCatalogListingHref(
  filters: CatalogFilters,
  pagination: CatalogListingPagination = { kind: "first" },
): string {
  const params = new URLSearchParams();

  for (const key of FILTER_PARAM_ORDER) {
    const value = filters[key];
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  if (pagination.kind !== "first") {
    params.set(pagination.kind, pagination.cursor);
  }

  const query = params.toString();
  return query === "" ? "/builds" : `/builds?${query}`;
}
