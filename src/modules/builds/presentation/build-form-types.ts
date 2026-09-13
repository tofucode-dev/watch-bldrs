import type {
  CurrencyCode,
  DialColour,
  HandsStyle,
  Movement,
  PartCategory,
  StrapType,
  WatchStyle,
} from "../domain/options";

export interface BuildFormInitialPart {
  category: PartCategory;
  name: string;
  productUrl: string | null;
  priceAmountMinor: number | null;
  currency: CurrencyCode | null;
}

export interface BuildFormInitialDraft {
  id: string;
  name: string | null;
  story: string | null;
  watchStyle: WatchStyle | null;
  movement: Movement | null;
  dialColour: DialColour | null;
  strapType: StrapType | null;
  handsStyle: HandsStyle | null;
  caseSizeMm: number | null;
  parts: BuildFormInitialPart[];
}
