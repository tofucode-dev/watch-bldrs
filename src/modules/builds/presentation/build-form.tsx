import { useCallback, useMemo, useRef, useState } from "react";
import { PlusIcon, TrashIcon } from "lucide-react";
import { actions } from "astro:actions";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OptionsSelect } from "@/components/ui/options-select";
import { PartsListHeader, PartsRow } from "@/components/ui/parts-row";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { Textarea } from "@/components/ui/textarea";

import {
  CURRENCY_OPTIONS,
  DIAL_COLOUR_OPTIONS,
  HANDS_STYLE_OPTIONS,
  MOVEMENT_OPTIONS,
  PART_CATEGORY_OPTIONS,
  STRAP_TYPE_OPTIONS,
  WATCH_STYLE_OPTIONS,
} from "../domain/options";
import {
  emptyFormState,
  formPriceFieldErrors,
  formStateFromInitialDraft,
  formStateToDraftInput,
  type BuildFormState,
  type PartRowState,
} from "./build-form-state";
import type { BuildFormInitialDraft } from "./build-form-types";

const PART_FIELD_KEYS = ["category", "name", "productUrl", "priceAmountMinor", "currency"] as const;

function partRowErrorMessages(fieldErrors: Record<string, string>, rowIndex: number): string[] {
  const messages = PART_FIELD_KEYS.map((field) => fieldErrors[`parts.${String(rowIndex)}.${field}`]).filter(
    (message): message is string => Boolean(message),
  );
  return [...new Set(messages)];
}

async function saveDraftViaAction(payload: ReturnType<typeof formStateToDraftInput>, draftId: string | null) {
  const result = draftId
    ? await actions.builds.update({ ...payload, id: draftId })
    : await actions.builds.createDraft(payload);

  if (result.error) {
    if (result.error.code === "UNAUTHORIZED") {
      return { errorMessage: "You must be signed in to save a draft" };
    }
    if (result.error.code === "NOT_FOUND") {
      return { errorMessage: "Draft not found" };
    }
    return { errorMessage: "Something went wrong" };
  }

  return { data: result.data };
  return { data: { ok: true, id: "123" } };
}

const NOT_SET_OPTION = { value: "", label: "Not set" };
const PART_COLUMNS = ["Category", "Name", "Product URL", "Price", "Currency"];

type BarStatus = "idle" | "saving" | "saved" | "error";

export interface BuildFormProps {
  initialDraft?: BuildFormInitialDraft;
}

function withNotSet(options: { value: string; label: string }[]) {
  return [NOT_SET_OPTION, ...options];
}

function cloneFormState(state: BuildFormState): BuildFormState {
  return {
    ...state,
    parts: state.parts.map((part) => ({ ...part })),
  };
}

function statusMessage(status: BarStatus, message: string | null, hasSavedDraft: boolean): string {
  if (message) {
    return message;
  }
  switch (status) {
    case "saving":
      return "Saving…";
    case "saved":
      return "Draft saved";
    case "error":
      return "Something went wrong";
    case "idle":
    default:
      return hasSavedDraft ? "Draft loaded" : "Nothing saved yet";
  }
}

export default function BuildForm({ initialDraft }: BuildFormProps) {
  const initialState = useMemo(
    () => (initialDraft ? formStateFromInitialDraft(initialDraft) : emptyFormState()),
    [initialDraft],
  );

  const [formState, setFormState] = useState<BuildFormState>(() => cloneFormState(initialState));
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [barStatus, setBarStatus] = useState<BarStatus>("idle");
  const [barMessage, setBarMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const savedSnapshot = useRef<BuildFormState>(cloneFormState(initialState));
  const inFlight = useRef(false);
  const draftIdRef = useRef<string | null>(initialDraft?.id ?? null);

  const hasSavedDraft = draftId !== null;

  const updateField = useCallback(<K extends keyof BuildFormState>(key: K, value: BuildFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    const fieldKey = key as string;
    setFieldErrors((prev) => {
      if (!(fieldKey in prev)) {
        return prev;
      }
      return Object.fromEntries(Object.entries(prev).filter(([entryKey]) => entryKey !== fieldKey));
    });
  }, []);

  const clearPartFieldError = useCallback((index: number, field: keyof PartRowState) => {
    const key = `parts.${index}.${field === "price" ? "priceAmountMinor" : field}`;
    setFieldErrors((prev) => {
      if (!(key in prev)) {
        return prev;
      }
      return Object.fromEntries(Object.entries(prev).filter(([entryKey]) => entryKey !== key));
    });
  }, []);

  const updatePart = useCallback(
    (index: number, patch: Partial<PartRowState>) => {
      setFormState((prev) => ({
        ...prev,
        parts: prev.parts.map((part, partIndex) => (partIndex === index ? { ...part, ...patch } : part)),
      }));
      for (const field of Object.keys(patch) as (keyof PartRowState)[]) {
        clearPartFieldError(index, field);
      }
    },
    [clearPartFieldError],
  );

  const addPart = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      parts: [
        ...prev.parts,
        {
          key: crypto.randomUUID(),
          category: "",
          name: "",
          productUrl: "",
          price: "",
          currency: "",
        },
      ],
    }));
  }, []);

  const removePart = useCallback((index: number) => {
    setFormState((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, partIndex) => partIndex !== index),
    }));
    setFieldErrors((prev) => {
      const prefix = `parts.${index}.`;
      const next = Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(prefix)));
      return next;
    });
  }, []);

  const handleDiscard = useCallback(() => {
    setFormState(cloneFormState(savedSnapshot.current));
    setFieldErrors({});
    setBarStatus("idle");
    setBarMessage(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setIsPending(true);
    setBarStatus("saving");
    setBarMessage(null);
    setFieldErrors({});

    const payload = formStateToDraftInput(formState);
    const currentId = draftIdRef.current;
    const priceErrors = formPriceFieldErrors(formState);

    try {
      if (Object.keys(priceErrors).length > 0) {
        setFieldErrors(priceErrors);
        setBarStatus("error");
        setBarMessage("Fix the highlighted fields");
        return;
      }

      const { data, errorMessage } = await saveDraftViaAction(payload, currentId);

      if (errorMessage) {
        setBarStatus("error");
        setBarMessage(errorMessage);
        return;
      }

      if (!data) {
        setBarStatus("error");
        setBarMessage("Something went wrong");
        return;
      }

      if (!data.ok) {
        setFieldErrors(data.fields);
        setBarStatus("error");
        setBarMessage("Fix the highlighted fields");
        return;
      }

      const nextId = data.id;
      if (!currentId) {
        draftIdRef.current = nextId;
        setDraftId(nextId);
        window.history.replaceState(null, "", `/account/builds/${nextId}/edit`);
      }

      savedSnapshot.current = cloneFormState(formState);
      setBarStatus("saved");
      setBarMessage(null);
    } catch {
      setBarStatus("error");
      setBarMessage("Something went wrong");
    } finally {
      inFlight.current = false;
      setIsPending(false);
    }
  }, [formState]);

  const watchStyleOptions = withNotSet(WATCH_STYLE_OPTIONS);
  const movementOptions = withNotSet(MOVEMENT_OPTIONS);
  const dialColourOptions = withNotSet(DIAL_COLOUR_OPTIONS);
  const strapTypeOptions = withNotSet(STRAP_TYPE_OPTIONS);
  const handsStyleOptions = withNotSet(HANDS_STYLE_OPTIONS);
  const categoryOptions = [{ value: "", label: "Select category" }, ...PART_CATEGORY_OPTIONS];

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="mb-8">
          <p className="font-script text-primary text-xl">{draftId ? "Edit draft" : "New build"}</p>
          <h1 className="font-heading mt-1 text-3xl font-extrabold tracking-tight uppercase">
            {draftId ? "Build form" : "Create draft"}
          </h1>
        </div>

        <FieldSet>
          <FieldGroup>
            <Field data-invalid={Boolean(fieldErrors.name)}>
              <FieldLabel htmlFor="build-name">Name</FieldLabel>
              <FieldContent>
                <Input
                  id="build-name"
                  value={formState.name}
                  onChange={(event) => {
                    updateField("name", event.target.value);
                  }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  disabled={isPending}
                />
                <FieldError errors={fieldErrors.name ? [{ message: fieldErrors.name }] : undefined} />
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(fieldErrors.story)}>
              <FieldLabel htmlFor="build-story">Story</FieldLabel>
              <FieldContent>
                <Textarea
                  id="build-story"
                  value={formState.story}
                  onChange={(event) => {
                    updateField("story", event.target.value);
                  }}
                  aria-invalid={Boolean(fieldErrors.story)}
                  disabled={isPending}
                  rows={5}
                />
                <FieldError errors={fieldErrors.story ? [{ message: fieldErrors.story }] : undefined} />
              </FieldContent>
            </Field>

            <div className="grid gap-7 md:grid-cols-2">
              <Field data-invalid={Boolean(fieldErrors.watchStyle)}>
                <FieldLabel htmlFor="build-watch-style">Watch style</FieldLabel>
                <FieldContent>
                  <OptionsSelect
                    id="build-watch-style"
                    options={watchStyleOptions}
                    value={formState.watchStyle}
                    onValueChange={(value) => {
                      updateField("watchStyle", value);
                    }}
                    placeholder="Not set"
                    aria-invalid={Boolean(fieldErrors.watchStyle)}
                    disabled={isPending}
                  />
                  <FieldError errors={fieldErrors.watchStyle ? [{ message: fieldErrors.watchStyle }] : undefined} />
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.movement)}>
                <FieldLabel htmlFor="build-movement">Movement</FieldLabel>
                <FieldContent>
                  <OptionsSelect
                    id="build-movement"
                    options={movementOptions}
                    value={formState.movement}
                    onValueChange={(value) => {
                      updateField("movement", value);
                    }}
                    placeholder="Not set"
                    aria-invalid={Boolean(fieldErrors.movement)}
                    disabled={isPending}
                  />
                  <FieldError errors={fieldErrors.movement ? [{ message: fieldErrors.movement }] : undefined} />
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.dialColour)}>
                <FieldLabel htmlFor="build-dial-colour">Dial colour</FieldLabel>
                <FieldContent>
                  <OptionsSelect
                    id="build-dial-colour"
                    options={dialColourOptions}
                    value={formState.dialColour}
                    onValueChange={(value) => {
                      updateField("dialColour", value);
                    }}
                    placeholder="Not set"
                    aria-invalid={Boolean(fieldErrors.dialColour)}
                    disabled={isPending}
                  />
                  <FieldError errors={fieldErrors.dialColour ? [{ message: fieldErrors.dialColour }] : undefined} />
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.strapType)}>
                <FieldLabel htmlFor="build-strap-type">Strap type</FieldLabel>
                <FieldContent>
                  <OptionsSelect
                    id="build-strap-type"
                    options={strapTypeOptions}
                    value={formState.strapType}
                    onValueChange={(value) => {
                      updateField("strapType", value);
                    }}
                    placeholder="Not set"
                    aria-invalid={Boolean(fieldErrors.strapType)}
                    disabled={isPending}
                  />
                  <FieldError errors={fieldErrors.strapType ? [{ message: fieldErrors.strapType }] : undefined} />
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.handsStyle)}>
                <FieldLabel htmlFor="build-hands-style">Hands style</FieldLabel>
                <FieldContent>
                  <OptionsSelect
                    id="build-hands-style"
                    options={handsStyleOptions}
                    value={formState.handsStyle}
                    onValueChange={(value) => {
                      updateField("handsStyle", value);
                    }}
                    placeholder="Not set"
                    aria-invalid={Boolean(fieldErrors.handsStyle)}
                    disabled={isPending}
                  />
                  <FieldError errors={fieldErrors.handsStyle ? [{ message: fieldErrors.handsStyle }] : undefined} />
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.caseSizeMm)}>
                <FieldLabel htmlFor="build-case-size">Case size (mm)</FieldLabel>
                <FieldContent>
                  <Input
                    id="build-case-size"
                    type="number"
                    min={20}
                    max={70}
                    inputMode="numeric"
                    value={formState.caseSizeMm}
                    onChange={(event) => {
                      updateField("caseSizeMm", event.target.value);
                    }}
                    aria-invalid={Boolean(fieldErrors.caseSizeMm)}
                    disabled={isPending}
                  />
                  <FieldError errors={fieldErrors.caseSizeMm ? [{ message: fieldErrors.caseSizeMm }] : undefined} />
                </FieldContent>
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              <FieldTitle>Parts</FieldTitle>
              <PartsListHeader columns={PART_COLUMNS} />
              {formState.parts.map((part, index) => {
                const categoryError = fieldErrors[`parts.${index}.category`];
                const nameError = fieldErrors[`parts.${index}.name`];
                const urlError = fieldErrors[`parts.${index}.productUrl`];
                const priceError = fieldErrors[`parts.${index}.priceAmountMinor`];
                const currencyError = fieldErrors[`parts.${index}.currency`];
                const rowErrors = partRowErrorMessages(fieldErrors, index);
                const idPrefix = `part-${part.key}`;

                return (
                  <PartsRow
                    key={part.key}
                    index={index + 1}
                    errors={rowErrors}
                    cells={[
                      {
                        label: "Category",
                        htmlFor: `${idPrefix}-category`,
                        control: (
                          <OptionsSelect
                            id={`${idPrefix}-category`}
                            options={categoryOptions}
                            value={part.category}
                            onValueChange={(value) => {
                              updatePart(index, { category: value });
                            }}
                            placeholder="Select category"
                            aria-invalid={Boolean(categoryError)}
                            disabled={isPending}
                          />
                        ),
                      },
                      {
                        label: "Name",
                        htmlFor: `${idPrefix}-name`,
                        control: (
                          <Input
                            id={`${idPrefix}-name`}
                            value={part.name}
                            onChange={(event) => {
                              updatePart(index, { name: event.target.value });
                            }}
                            aria-invalid={Boolean(nameError)}
                            disabled={isPending}
                          />
                        ),
                      },
                      {
                        label: "Product URL",
                        htmlFor: `${idPrefix}-url`,
                        control: (
                          <Input
                            id={`${idPrefix}-url`}
                            type="url"
                            value={part.productUrl}
                            onChange={(event) => {
                              updatePart(index, { productUrl: event.target.value });
                            }}
                            aria-invalid={Boolean(urlError)}
                            disabled={isPending}
                          />
                        ),
                      },
                      {
                        label: "Price",
                        htmlFor: `${idPrefix}-price`,
                        control: (
                          <Input
                            id={`${idPrefix}-price`}
                            inputMode="decimal"
                            value={part.price}
                            onChange={(event) => {
                              updatePart(index, { price: event.target.value });
                            }}
                            aria-invalid={Boolean(priceError)}
                            disabled={isPending}
                          />
                        ),
                      },
                      {
                        label: "Currency",
                        htmlFor: `${idPrefix}-currency`,
                        control: (
                          <OptionsSelect
                            id={`${idPrefix}-currency`}
                            options={CURRENCY_OPTIONS}
                            value={part.currency}
                            onValueChange={(value) => {
                              updatePart(index, { currency: value });
                            }}
                            placeholder="Currency"
                            aria-invalid={Boolean(currencyError)}
                            disabled={isPending}
                          />
                        ),
                      },
                    ]}
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove part ${String(index + 1)}`}
                        onClick={() => {
                          removePart(index);
                        }}
                        disabled={isPending}
                      >
                        <TrashIcon />
                      </Button>
                    }
                  />
                );
              })}
              <Button type="button" variant="outline" className="self-start" onClick={addPart} disabled={isPending}>
                <PlusIcon />
                Add part
              </Button>
            </div>
          </FieldGroup>
        </FieldSet>
      </div>

      <StickyActionBar
        status={statusMessage(barStatus, barMessage, hasSavedDraft)}
        secondary={
          <Button type="button" variant="outline" onClick={handleDiscard} disabled={isPending}>
            Discard
          </Button>
        }
        primary={
          <Button type="button" onClick={handleSave} disabled={isPending}>
            Save Draft
          </Button>
        }
      />
    </div>
  );
}
