import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type MainImageValidationReason, validateMainImageFile } from "@/lib/main-image-file";

const FILE_ACCEPT = "image/jpeg,image/png,image/webp";
const PREVIEW_ALT = "Main photo preview";

const VALIDATION_MESSAGES: Record<MainImageValidationReason, string> = {
  empty: "Choose an image file.",
  oversize: "Image must be 5 MB or smaller.",
  type: "Use a JPEG, PNG, or WebP image.",
  signature: "This file is not a valid JPEG, PNG, or WebP image.",
};

export interface PhotoUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  id?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

function firstDroppedFile(event: DragEvent<HTMLDivElement>): File | undefined {
  return event.dataTransfer.files[0];
}

function MainPhotoPreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // Blob URLs are an external resource; this effect owns create + revoke.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing preview src to URL.createObjectURL
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!previewUrl) {
    return null;
  }

  return <img src={previewUrl} alt={PREVIEW_ALT} className="max-h-56 w-full object-contain" />;
}

export function PhotoUpload({ file, onFileChange, id, error, disabled = false, className }: PhotoUploadProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const applyGenerationRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const parentInvalid = Boolean(error);
  const isInvalid = parentInvalid || Boolean(validationError);

  async function applyCandidate(candidate: File): Promise<void> {
    const generation = applyGenerationRef.current + 1;
    applyGenerationRef.current = generation;

    const result = await validateMainImageFile(candidate);
    if (generation !== applyGenerationRef.current) {
      return;
    }

    if (!result.ok) {
      setValidationError(VALIDATION_MESSAGES[result.reason]);
      return;
    }

    setValidationError(null);
    onFileChange(candidate);
  }

  function openPicker(): void {
    inputRef.current?.click();
  }

  async function handleInputChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const candidate = event.target.files?.[0];
    event.target.value = "";
    if (!candidate || disabled) {
      return;
    }

    await applyCandidate(candidate);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    if (disabled) {
      return;
    }

    setDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragOver(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>): Promise<void> {
    event.preventDefault();
    setDragOver(false);
    if (disabled) {
      return;
    }

    const candidate = firstDroppedFile(event);
    if (!candidate) {
      return;
    }

    await applyCandidate(candidate);
  }

  function handleRemove(): void {
    applyGenerationRef.current += 1;
    setValidationError(null);
    onFileChange(null);
  }

  return (
    <div
      data-slot="photo-upload"
      data-drag-over={dragOver ? "true" : undefined}
      aria-invalid={isInvalid || undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        "border-input bg-card flex min-h-64 w-full flex-col items-center justify-center gap-3 border border-dashed p-6 text-center",
        "aria-invalid:border-destructive",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={FILE_ACCEPT}
        tabIndex={-1}
        disabled={disabled}
        className="sr-only"
        onChange={handleInputChange}
      />

      {file ? (
        <>
          <MainPhotoPreview file={file} />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="outline" disabled={disabled} onClick={openPicker}>
              Choose image
            </Button>
            <Button type="button" variant="ghost" disabled={disabled} onClick={handleRemove}>
              Remove
            </Button>
          </div>
        </>
      ) : (
        <>
          <Camera className="text-muted-foreground size-10" strokeWidth={1.5} aria-hidden="true" />
          <p className="font-heading text-foreground text-sm font-bold tracking-[0.18em] uppercase">ONE IMAGE ONLY</p>
          <div className="text-muted-foreground space-y-0.5 text-xs font-medium tracking-[0.16em] uppercase">
            <p>JPEG / PNG / WEBP</p>
            <p>MAX 5 MB</p>
          </div>
          <Button type="button" variant="outline" disabled={disabled} onClick={openPicker}>
            Choose image
          </Button>
          <p className="text-muted-foreground text-xs">or drag and drop</p>
        </>
      )}

      {validationError ? (
        <p role="alert" className="text-destructive text-sm">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}
