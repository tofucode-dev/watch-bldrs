import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_LABEL = "Load more builds";
const DEFAULT_END_LABEL = "No more builds to show";

export interface ListingLoadMoreProps extends Omit<ComponentProps<"button">, "children" | "aria-busy"> {
  loading?: boolean;
  hasMore?: boolean;
  label?: string;
  endLabel?: string;
}

export function ListingLoadMore({
  loading = false,
  hasMore = true,
  label = DEFAULT_LABEL,
  endLabel = DEFAULT_END_LABEL,
  disabled,
  type = "button",
  className,
  onClick,
  ...props
}: ListingLoadMoreProps) {
  if (!hasMore) {
    return (
      <p data-slot="listing-load-more-end" className="text-muted-foreground py-6 text-center text-sm">
        {endLabel}
      </p>
    );
  }

  const effectiveDisabled = (disabled ?? false) || loading;

  return (
    <div data-slot="listing-load-more" className="flex justify-center py-6">
      <Button
        {...props}
        type={type}
        variant="outline"
        size="lg"
        disabled={effectiveDisabled}
        aria-busy={loading}
        className={cn("font-heading min-w-48 tracking-widest uppercase", className)}
        onClick={onClick}
      >
        {loading ? "Loading…" : label}
      </Button>
    </div>
  );
}
