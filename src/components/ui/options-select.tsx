"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  fromRadixValue,
  mapOptionsForRadix,
  toRadixValue,
  type SelectOption,
} from "@/components/ui/options-select-mapping";

export interface OptionsSelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
}

export function OptionsSelect({
  options,
  value,
  onValueChange,
  placeholder,
  id,
  disabled,
  "aria-invalid": ariaInvalid,
}: OptionsSelectProps) {
  const radixOptions = mapOptionsForRadix(options);

  return (
    <Select
      value={toRadixValue(value)}
      onValueChange={(radixValue) => {
        onValueChange(fromRadixValue(radixValue));
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-invalid={ariaInvalid} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {radixOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
