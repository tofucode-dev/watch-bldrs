import type { ComponentProps } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterChipProps extends ComponentProps<"div"> {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
}

export function FilterChip({ label, onRemove, disabled = false, className, ...props }: FilterChipProps) {
  const removeLabel = `Remove ${label} filter`;

  return (
    <div
      data-slot="filter-chip"
      className={cn(
        "bg-muted text-foreground inline-flex max-w-full items-center gap-1 rounded-sm px-2 py-1 text-sm",
        disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      <span className="truncate">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground size-6 shrink-0"
        aria-label={removeLabel}
        disabled={disabled}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </div>
  );
}
