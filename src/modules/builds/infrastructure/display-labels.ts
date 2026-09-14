const WATCH_STYLE_LABELS: Record<string, string> = {
  diver: "Diver",
  field: "Field",
  dress: "Dress",
  gmt: "GMT",
  pilot: "Pilot",
  integrated: "Integrated",
  other: "Other",
};

const MOVEMENT_LABELS: Record<string, string> = {
  nh35: "NH35",
  nh36: "NH36",
  nh34: "NH34",
  miyota_8215: "Miyota 8215",
  other: "Other",
};

const DIAL_COLOUR_LABELS: Record<string, string> = {
  black: "Black",
  white: "White",
  blue: "Blue",
  green: "Green",
  silver: "Silver",
  other: "Other",
};

const STRAP_TYPE_LABELS: Record<string, string> = {
  leather: "Leather",
  nato: "NATO",
  rubber: "Rubber",
  steel_bracelet: "Steel Bracelet",
  other: "Other",
};

function labelFor(map: Record<string, string>, value: string | null): string | null {
  if (value === null) {
    return null;
  }
  return map[value] ?? null;
}

export function watchStyleLabel(value: string | null): string | null {
  return labelFor(WATCH_STYLE_LABELS, value);
}

export function movementLabel(value: string | null): string | null {
  return labelFor(MOVEMENT_LABELS, value);
}

export function dialColourLabel(value: string | null): string | null {
  return labelFor(DIAL_COLOUR_LABELS, value);
}

export function strapTypeLabel(value: string | null): string | null {
  return labelFor(STRAP_TYPE_LABELS, value);
}
