export const EMPTY_OPTION_SENTINEL = "__wb_options_select_empty__";

export interface SelectOption {
  value: string;
  label: string;
}

export function isUnsetValue(value: string | undefined): boolean {
  return value === undefined || value === "";
}

export function toRadixValue(value: string | undefined): string | undefined {
  if (isUnsetValue(value)) {
    return undefined;
  }

  return value;
}

export function fromRadixValue(radixValue: string): string {
  if (radixValue === EMPTY_OPTION_SENTINEL) {
    return "";
  }

  return radixValue;
}

export function mapOptionsForRadix(options: SelectOption[]): SelectOption[] {
  return options.map((option) => ({
    value: option.value === "" ? EMPTY_OPTION_SENTINEL : option.value,
    label: option.label,
  }));
}

export function radixItemValues(options: SelectOption[]): string[] {
  return mapOptionsForRadix(options).map((option) => option.value);
}
