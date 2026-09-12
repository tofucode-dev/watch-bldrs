export const WATCH_STYLES = ["diver", "field", "dress", "gmt", "pilot", "integrated", "other"] as const;
export const MOVEMENTS = ["nh35", "nh36", "nh34", "miyota_8215", "other"] as const;
export const DIAL_COLOURS = ["black", "white", "blue", "green", "silver", "other"] as const;
export const STRAP_TYPES = ["leather", "nato", "rubber", "steel_bracelet", "other"] as const;
export const HANDS_STYLES = ["mercedes", "sword", "dauphine", "baton", "other"] as const;
export const PART_CATEGORIES = [
  "movement",
  "case",
  "dial",
  "hands",
  "bezel",
  "crystal",
  "strap",
  "bracelet",
  "other",
] as const;
export const CURRENCIES = ["USD", "EUR", "GBP", "PLN", "CHF", "JPY", "CAD", "AUD"] as const;

export type WatchStyle = (typeof WATCH_STYLES)[number];
export type Movement = (typeof MOVEMENTS)[number];
export type DialColour = (typeof DIAL_COLOURS)[number];
export type StrapType = (typeof STRAP_TYPES)[number];
export type HandsStyle = (typeof HANDS_STYLES)[number];
export type PartCategory = (typeof PART_CATEGORIES)[number];
export type CurrencyCode = (typeof CURRENCIES)[number];

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export const WATCH_STYLE_OPTIONS: SelectOption<WatchStyle>[] = [
  { value: "diver", label: "Diver" },
  { value: "field", label: "Field" },
  { value: "dress", label: "Dress" },
  { value: "gmt", label: "GMT" },
  { value: "pilot", label: "Pilot" },
  { value: "integrated", label: "Integrated" },
  { value: "other", label: "Other" },
];

export const MOVEMENT_OPTIONS: SelectOption<Movement>[] = [
  { value: "nh35", label: "NH35" },
  { value: "nh36", label: "NH36" },
  { value: "nh34", label: "NH34" },
  { value: "miyota_8215", label: "Miyota 8215" },
  { value: "other", label: "Other" },
];

export const DIAL_COLOUR_OPTIONS: SelectOption<DialColour>[] = [
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "silver", label: "Silver" },
  { value: "other", label: "Other" },
];

export const STRAP_TYPE_OPTIONS: SelectOption<StrapType>[] = [
  { value: "leather", label: "Leather" },
  { value: "nato", label: "NATO" },
  { value: "rubber", label: "Rubber" },
  { value: "steel_bracelet", label: "Steel Bracelet" },
  { value: "other", label: "Other" },
];

export const HANDS_STYLE_OPTIONS: SelectOption<HandsStyle>[] = [
  { value: "mercedes", label: "Mercedes" },
  { value: "sword", label: "Sword" },
  { value: "dauphine", label: "Dauphine" },
  { value: "baton", label: "Baton" },
  { value: "other", label: "Other" },
];

export const PART_CATEGORY_OPTIONS: SelectOption<PartCategory>[] = [
  { value: "movement", label: "Movement" },
  { value: "case", label: "Case" },
  { value: "dial", label: "Dial" },
  { value: "hands", label: "Hands" },
  { value: "bezel", label: "Bezel" },
  { value: "crystal", label: "Crystal" },
  { value: "strap", label: "Strap" },
  { value: "bracelet", label: "Bracelet" },
  { value: "other", label: "Other" },
];

export const CURRENCY_OPTIONS: SelectOption<CurrencyCode>[] = CURRENCIES.map((value) => ({
  value,
  label: value,
}));

const WATCH_STYLE_SET = new Set<string>(WATCH_STYLES);
const MOVEMENT_SET = new Set<string>(MOVEMENTS);
const DIAL_COLOUR_SET = new Set<string>(DIAL_COLOURS);
const STRAP_TYPE_SET = new Set<string>(STRAP_TYPES);
const HANDS_STYLE_SET = new Set<string>(HANDS_STYLES);
const PART_CATEGORY_SET = new Set<string>(PART_CATEGORIES);
const CURRENCY_SET = new Set<string>(CURRENCIES);

export function isWatchStyle(value: string): value is WatchStyle {
  return WATCH_STYLE_SET.has(value);
}

export function isMovement(value: string): value is Movement {
  return MOVEMENT_SET.has(value);
}

export function isDialColour(value: string): value is DialColour {
  return DIAL_COLOUR_SET.has(value);
}

export function isStrapType(value: string): value is StrapType {
  return STRAP_TYPE_SET.has(value);
}

export function isHandsStyle(value: string): value is HandsStyle {
  return HANDS_STYLE_SET.has(value);
}

export function isPartCategory(value: string): value is PartCategory {
  return PART_CATEGORY_SET.has(value);
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_SET.has(value);
}
