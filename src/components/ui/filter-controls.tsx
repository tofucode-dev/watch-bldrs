import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Label } from "@/components/ui/label";
import { OptionsSelect } from "@/components/ui/options-select";
import { cn } from "@/lib/utils";

export interface FilterDimension {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value?: string;
}

/** Controlled filter toolbar. Root div props (e.g. `disabled`) are layout-only and do not disable inner selects or chips — add explicit forwarding in S-05 if loading states need it. */
export interface FilterControlsProps extends ComponentProps<"div"> {
  dimensions: FilterDimension[];
  onDimensionChange: (id: string, value: string) => void;
  onClearAll: () => void;
}

function isActiveValue(value?: string): boolean {
  return value !== undefined && value !== "";
}

function resolveChipLabel(dimension: FilterDimension): string {
  const value = dimension.value ?? "";
  const option = dimension.options.find((entry) => entry.value === value);

  return option?.label ?? value;
}

export function FilterControls({
  dimensions,
  onDimensionChange,
  onClearAll,
  className,
  ...props
}: FilterControlsProps) {
  const activeDimensions = dimensions.filter((dimension) => isActiveValue(dimension.value));
  const showActiveFilters = activeDimensions.length > 0;

  return (
    <div data-slot="filter-controls" className={cn("flex w-full max-w-6xl flex-col gap-3 px-4", className)} {...props}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {dimensions.map((dimension) => {
          const triggerId = `filter-${dimension.id}`;

          return (
            <div key={dimension.id} className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={triggerId}>{dimension.label}</Label>
              <OptionsSelect
                id={triggerId}
                options={dimension.options}
                value={dimension.value ?? ""}
                onValueChange={(value) => {
                  onDimensionChange(dimension.id, value);
                }}
                placeholder="All"
                size="sm"
              />
            </div>
          );
        })}
      </div>
      {showActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeDimensions.map((dimension) => (
            <FilterChip
              key={dimension.id}
              label={resolveChipLabel(dimension)}
              onRemove={() => {
                onDimensionChange(dimension.id, "");
              }}
            />
          ))}
          <Button type="button" variant="link" className="text-muted-foreground h-auto px-0" onClick={onClearAll}>
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}
