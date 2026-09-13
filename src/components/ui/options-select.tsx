import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  fromRadixValue,
  mapOptionsForRadix,
  toRadixValue,
  type SelectOption,
} from "@/components/ui/options-select-mapping";
import { cn } from "@/lib/utils";

export interface OptionsSelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
  size?: "sm" | "default";
  className?: string;
}

export function OptionsSelect({
  options,
  value,
  onValueChange,
  placeholder,
  id,
  disabled,
  "aria-invalid": ariaInvalid,
  size,
  className,
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
      <SelectTrigger id={id} aria-invalid={ariaInvalid} size={size} className={cn("w-full", className)}>
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
