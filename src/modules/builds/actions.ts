import { ActionError, defineAction } from "astro:actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "astro/zod";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase";

import { actorFromUser } from "./application/actor";
import { attachMainImage } from "./application/attach-main-image";
import { createDraftBuild } from "./application/create-draft-build";
import { publishBuild } from "./application/publish-build";
import { updateDraftBuild } from "./application/update-draft-build";
import { DraftNotFoundError, DraftValidationError, UnauthenticatedError, UnexpectedStoreError } from "./domain/errors";
import { createSupabaseBuildStore } from "./infrastructure/supabase-build-store";

const partInputSchema = z.object({
  category: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  productUrl: z.string().nullable().optional(),
  priceAmountMinor: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
});

const draftInputSchema = z.object({
  name: z.string().nullable().optional(),
  story: z.string().nullable().optional(),
  watchStyle: z.string().nullable().optional(),
  movement: z.string().nullable().optional(),
  dialColour: z.string().nullable().optional(),
  strapType: z.string().nullable().optional(),
  handsStyle: z.string().nullable().optional(),
  caseSizeMm: z.number().nullable().optional(),
  parts: z.array(partInputSchema).optional(),
});

export type DraftActionResult =
  { ok: true; id: string } | { ok: false; error: "validation"; fields: Record<string, string> };

function storeFromContext(context: { request: Request; cookies: Parameters<typeof createClient>[1] }) {
  const client = createClient(context.request.headers, context.cookies);
  if (!client) {
    throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" });
  }
  return createSupabaseBuildStore(client as SupabaseClient<Database>);
}

function toActionResult(error: unknown): DraftActionResult {
  if (error instanceof ActionError) {
    throw error;
  }
  if (error instanceof DraftValidationError) {
    return { ok: false, error: "validation", fields: { ...error.fields } };
  }
  if (error instanceof UnauthenticatedError) {
    throw new ActionError({ code: "UNAUTHORIZED", message: error.message });
  }
  if (error instanceof DraftNotFoundError) {
    throw new ActionError({ code: "NOT_FOUND", message: error.message });
  }
  if (error instanceof UnexpectedStoreError) {
    throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  }
  throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" });
}

export const builds = {
  createDraft: defineAction({
    input: draftInputSchema,
    handler: async (input, context): Promise<DraftActionResult> => {
      try {
        const result = await createDraftBuild(actorFromUser(context.locals.user), input, storeFromContext(context));
        return { ok: true, id: result.id };
      } catch (error) {
        return toActionResult(error);
      }
    },
  }),

  update: defineAction({
    input: draftInputSchema.extend({ id: z.uuid() }),
    handler: async (input, context): Promise<DraftActionResult> => {
      try {
        const { id, ...draft } = input;
        const result = await updateDraftBuild(actorFromUser(context.locals.user), id, draft, storeFromContext(context));
        return { ok: true, id: result.id };
      } catch (error) {
        return toActionResult(error);
      }
    },
  }),

  attachMainImage: defineAction({
    input: z.object({
      id: z.uuid(),
      path: z.string().nullable(),
    }),
    handler: async (input, context): Promise<DraftActionResult> => {
      try {
        const result = await attachMainImage(
          actorFromUser(context.locals.user),
          input.id,
          input.path,
          storeFromContext(context),
        );
        return { ok: true, id: result.id };
      } catch (error) {
        return toActionResult(error);
      }
    },
  }),

  publish: defineAction({
    input: z.object({ id: z.uuid() }),
    handler: async (input, context): Promise<DraftActionResult> => {
      try {
        const result = await publishBuild(actorFromUser(context.locals.user), input.id, storeFromContext(context));
        return { ok: true, id: result.id };
      } catch (error) {
        return toActionResult(error);
      }
    },
  }),
};
