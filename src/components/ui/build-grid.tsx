import { Children, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface BuildGridProps extends ComponentProps<"ul"> {
  children: ReactNode;
}

export function BuildGrid({ children, className, ...props }: BuildGridProps) {
  const items = Children.toArray(children);

  return (
    <ul
      data-slot="build-grid"
      className={cn("grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3", className)}
      {...props}
    >
      {items.map((child, index) => (
        <li key={index} data-slot="build-grid-item" className="min-w-0">
          {child}
        </li>
      ))}
    </ul>
  );
}
