import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const paperLabelVariants = cva(
  "inline-block px-3 py-1 font-heading text-xs font-bold tracking-widest uppercase shadow-paper torn-paper",
  {
    variants: {
      tone: {
        primary: "bg-primary text-primary-foreground",
        mustard: "bg-mustard text-foreground",
        olive: "bg-olive text-primary-foreground",
        field: "bg-field text-primary-foreground",
        pilot: "bg-pilot text-foreground",
      },
      rotation: {
        none: "",
        slight: "-rotate-1",
        left: "-rotate-2",
        right: "rotate-2",
      },
    },
    defaultVariants: {
      tone: "primary",
      rotation: "slight",
    },
  },
);

function PaperLabel({
  className,
  tone,
  rotation,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof paperLabelVariants>) {
  return <span data-slot="paper-label" className={cn(paperLabelVariants({ tone, rotation, className }))} {...props} />;
}

export { PaperLabel, paperLabelVariants };
