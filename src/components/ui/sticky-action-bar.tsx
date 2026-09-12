import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface StickyActionBarProps extends ComponentProps<"div"> {
  status?: ReactNode;
  secondary?: ReactNode;
  primary?: ReactNode;
}

/**
 * Presentational sticky chrome for form actions (status + secondary + primary slots).
 * Uses CSS `position: sticky; bottom: 0` so it sticks to the bottom of the page
 * (the nearest scrolling ancestor). S-02 can wrap the form and place this after
 * the fields. The bar does not own save/discard behavior or submit a form.
 */
export function StickyActionBar({ status, secondary, primary, className, ...props }: StickyActionBarProps) {
  return (
    <div
      data-slot="sticky-action-bar"
      className={cn(
        "bg-sticky sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3",
        className,
      )}
      {...props}
    >
      <div data-slot="sticky-action-bar-status" className="text-muted-foreground text-sm">
        {status}
      </div>
      <div className="ms-auto flex items-center gap-2">
        <div data-slot="sticky-action-bar-secondary">{secondary}</div>
        <div data-slot="sticky-action-bar-primary">{primary}</div>
      </div>
    </div>
  );
}
