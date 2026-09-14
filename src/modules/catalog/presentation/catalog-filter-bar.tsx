import { FilterControls, type FilterDimension } from "@/components/ui/filter-controls";

import type { CatalogFilters } from "../application/catalog-filters";
import { buildCatalogListingHref } from "../application/catalog-url";
import { CATALOG_FILTER_DIMENSIONS } from "./catalog-filter-dimensions";

export interface CatalogFilterBarProps {
  initialFilters: CatalogFilters;
  navigate?: (href: string) => void;
}

function toFilterDimensions(filters: CatalogFilters): FilterDimension[] {
  return CATALOG_FILTER_DIMENSIONS.map((dimension) => ({
    id: dimension.id,
    label: dimension.label,
    options: [...dimension.options],
    value: filters[dimension.param]?.toString(),
  }));
}

export function CatalogFilterBar({
  initialFilters,
  navigate = (href) => {
    window.location.assign(href);
  },
}: CatalogFilterBarProps) {
  const dimensions = toFilterDimensions(initialFilters);

  function handleDimensionChange(id: string, value: string) {
    const dimension = CATALOG_FILTER_DIMENSIONS.find((entry) => entry.id === id);
    if (!dimension) {
      return;
    }

    const nextFilters: CatalogFilters = { ...initialFilters };
    if (value === "") {
      nextFilters[dimension.param] = undefined;
    } else if (dimension.param === "case_size_mm") {
      nextFilters.case_size_mm = Number(value);
    } else {
      nextFilters[dimension.param] = value;
    }

    navigate(buildCatalogListingHref(nextFilters, { kind: "first" }));
  }

  return (
    <section data-slot="catalog-filter-bar" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <FilterControls
        dimensions={dimensions}
        onDimensionChange={handleDimensionChange}
        onClearAll={() => {
          navigate("/builds");
        }}
      />
    </section>
  );
}
