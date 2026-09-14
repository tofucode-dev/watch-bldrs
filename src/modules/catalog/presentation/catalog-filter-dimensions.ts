import {
  CASE_SIZE_MAX_MM,
  CASE_SIZE_MIN_MM,
  DIAL_COLOUR_OPTIONS,
  MOVEMENT_OPTIONS,
  STRAP_TYPE_OPTIONS,
  WATCH_STYLE_OPTIONS,
} from "@/modules/builds";

export const CATALOG_FILTER_DIMENSIONS = [
  {
    id: "style",
    param: "watch_style",
    label: "Watch style",
    options: WATCH_STYLE_OPTIONS,
  },
  {
    id: "movement",
    param: "movement",
    label: "Movement",
    options: MOVEMENT_OPTIONS,
  },
  {
    id: "dial-colour",
    param: "dial_colour",
    label: "Dial colour",
    options: DIAL_COLOUR_OPTIONS,
  },
  {
    id: "strap-type",
    param: "strap_type",
    label: "Strap type",
    options: STRAP_TYPE_OPTIONS,
  },
  {
    id: "case-size",
    param: "case_size_mm",
    label: "Case size",
    options: [
      { value: "", label: "All" },
      ...Array.from({ length: CASE_SIZE_MAX_MM - CASE_SIZE_MIN_MM + 1 }, (_, index) => {
        const value = CASE_SIZE_MIN_MM + index;
        return { value: String(value), label: `${value} mm` };
      }),
    ],
  },
] as const;

export type CatalogFilterDimension = (typeof CATALOG_FILTER_DIMENSIONS)[number];
