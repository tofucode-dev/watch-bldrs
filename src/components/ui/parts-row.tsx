import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface PartsRowCell {
  label: string;
  htmlFor: string;
  control: ReactNode;
}

type PartsColumnsStyle = CSSProperties & {
  "--parts-columns": number;
};

function partsColumnsStyle(columnCount: number): PartsColumnsStyle {
  return { "--parts-columns": columnCount };
}

const partsListGridClassName = "md:[grid-template-columns:2rem_repeat(var(--parts-columns),minmax(0,1fr))_2.25rem]";

export interface PartsListHeaderProps extends ComponentProps<"div"> {
  columns: string[];
  indexLabel?: string;
}

export function PartsListHeader({ columns, indexLabel = "#", className, style, ...props }: PartsListHeaderProps) {
  return (
    <div
      data-slot="parts-list-header"
      className={cn(
        "text-muted-foreground hidden gap-3 text-sm font-medium md:grid",
        partsListGridClassName,
        className,
      )}
      style={{ ...partsColumnsStyle(columns.length), ...style }}
      {...props}
    >
      <div data-slot="parts-list-header-index">{indexLabel}</div>
      {columns.map((column, columnIndex) => (
        <div key={`${column}-${String(columnIndex)}`}>{column}</div>
      ))}
      <span className="sr-only">Actions</span>
    </div>
  );
}

export interface PartsRowProps extends ComponentProps<"div"> {
  index: ReactNode;
  cells: PartsRowCell[];
  action?: ReactNode;
}

export function PartsRow({ index, cells, action, className, style, ...props }: PartsRowProps) {
  return (
    <div
      data-slot="parts-row"
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3",
        "md:items-end",
        partsListGridClassName,
        className,
      )}
      style={{ ...partsColumnsStyle(cells.length), ...style }}
      {...props}
    >
      <div
        data-slot="parts-row-index"
        className="text-muted-foreground col-start-1 row-start-1 flex h-9 items-center text-sm font-medium"
      >
        {index}
      </div>
      {cells.map((cell, cellIndex) => (
        <div
          key={`${cell.label}-${String(cellIndex)}`}
          data-slot="parts-row-cell"
          className="col-span-2 min-w-0 md:col-span-1 md:col-start-auto md:row-start-1"
        >
          <div className="flex min-w-0 flex-col items-stretch gap-1.5">
            <Label htmlFor={cell.htmlFor} data-slot="parts-row-cell-label" className="md:sr-only">
              {cell.label}
            </Label>
            {cell.control}
          </div>
        </div>
      ))}
      {action ? (
        <div
          data-slot="parts-row-action"
          className="col-start-2 row-start-1 flex h-9 items-center justify-end md:-col-start-1"
        >
          {action}
        </div>
      ) : null}
    </div>
  );
}
