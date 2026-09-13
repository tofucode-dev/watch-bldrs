import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { PaperLabel, type paperLabelVariants } from "@/components/ui/paper-label";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

const UNTITLED_BUILD = "Untitled build";

export interface BuildCardProps extends Omit<ComponentProps<"div">, "children"> {
  href: string;
  name?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageLoading?: "lazy" | "eager";
  imageDecoding?: "async" | "sync" | "auto";
  styleLabel?: string | null;
  styleLabelTone?: VariantProps<typeof paperLabelVariants>["tone"];
  movement?: string | null;
  dialColour?: string | null;
  strapType?: string | null;
  caseSizeMm?: number | null;
  likeCount: number;
  footerAction?: ReactNode;
}

function resolveDisplayName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return UNTITLED_BUILD;
  }

  return trimmed;
}

function resolveImageAlt(displayName: string, imageAlt?: string): string {
  if (imageAlt !== undefined) {
    return imageAlt;
  }

  return displayName === UNTITLED_BUILD ? "" : displayName;
}

function BuildCardMedia({
  href,
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
  imageLoading = "lazy",
  imageDecoding,
  styleLabel,
  styleLabelTone = "olive",
}: Pick<
  BuildCardProps,
  | "href"
  | "imageUrl"
  | "imageAlt"
  | "imageWidth"
  | "imageHeight"
  | "imageLoading"
  | "imageDecoding"
  | "styleLabel"
  | "styleLabelTone"
> & { imageAlt: string }) {
  const trimmedStyleLabel = styleLabel?.trim();

  return (
    <div className="relative">
      <a href={href} className="focus-visible:ring-ring/50 block focus-visible:ring-[3px] focus-visible:outline-none">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            width={imageWidth}
            height={imageHeight}
            loading={imageLoading}
            decoding={imageDecoding}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div
            data-slot="build-card-image-placeholder"
            aria-hidden="true"
            className="bg-muted flex aspect-[4/3] w-full items-center justify-center"
          />
        )}
      </a>
      {trimmedStyleLabel ? (
        <PaperLabel tone={styleLabelTone} rotation="left" className="absolute top-3 left-3">
          {trimmedStyleLabel}
        </PaperLabel>
      ) : null}
    </div>
  );
}

export function BuildCard({
  href,
  name,
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
  imageLoading,
  imageDecoding,
  styleLabel,
  styleLabelTone,
  movement,
  dialColour,
  strapType,
  caseSizeMm,
  likeCount,
  footerAction,
  className,
  ...props
}: BuildCardProps) {
  const displayName = resolveDisplayName(name);
  const resolvedImageAlt = resolveImageAlt(displayName, imageAlt);
  const metadataTags = [
    movement?.trim() ? { key: "movement", label: movement.trim(), variant: "olive" as const } : null,
    caseSizeMm != null ? { key: "case-size", label: `${caseSizeMm}mm`, variant: "field" as const } : null,
    strapType?.trim() ? { key: "strap", label: strapType.trim(), variant: "mustard" as const } : null,
    dialColour?.trim() ? { key: "dial", label: dialColour.trim(), variant: "pilot" as const } : null,
  ].filter((tag): tag is NonNullable<typeof tag> => tag !== null);

  return (
    <Card data-slot="build-card" className={cn(className)} {...props}>
      <CardContent className="flex flex-col gap-0 p-0">
        <BuildCardMedia
          href={href}
          imageUrl={imageUrl}
          imageAlt={resolvedImageAlt}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          imageLoading={imageLoading}
          imageDecoding={imageDecoding}
          styleLabel={styleLabel}
          styleLabelTone={styleLabelTone}
        />
        <div className="flex flex-col gap-3 p-4">
          <CardTitle className="text-base">
            <a
              href={href}
              className="hover:text-primary focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            >
              {displayName}
            </a>
          </CardTitle>
          {metadataTags.length > 0 ? (
            <div data-slot="build-card-metadata" className="flex flex-wrap gap-2">
              {metadataTags.map((tag) => (
                <Badge key={tag.key} variant={tag.variant}>
                  {tag.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="border-border justify-between gap-2 border-t pt-4">
        <span data-slot="build-card-like-count" className="text-muted-foreground text-sm">
          {likeCount} {likeCount === 1 ? "like" : "likes"}
        </span>
        {footerAction ? <div data-slot="build-card-footer-action">{footerAction}</div> : null}
      </CardFooter>
    </Card>
  );
}

export { UNTITLED_BUILD };
