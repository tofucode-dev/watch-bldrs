import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/database.types";

import type { BuildStore } from "../application/ports/build-store";
import { previewUrlForOwnedMainImagePath } from "./main-image-preview";
import {
  isCurrencyCode,
  isDialColour,
  isHandsStyle,
  isMovement,
  isPartCategory,
  isStrapType,
  isWatchStyle,
} from "../domain/options";
import type { OwnedDraft, OwnedDraftPart, ValidatedDraft } from "../domain/types";
import { mapStoreError } from "./map-store-error";

type BuildsClient = SupabaseClient<Database>;

interface DraftRow {
  id: string;
  name: string | null;
  story: string | null;
  watch_style: string | null;
  movement: string | null;
  dial_colour: string | null;
  strap_type: string | null;
  hands_style: string | null;
  case_size_mm: number | null;
  main_image_path: string | null;
  build_parts: PartRow[] | null;
}

interface PartRow {
  category: string;
  name: string;
  product_url: string | null;
  price_amount_minor: number | null;
  currency: string | null;
  position: number;
}

function toRpcParts(draft: ValidatedDraft): Json {
  return draft.parts.map((part) => ({
    category: part.category,
    name: part.name,
    product_url: part.productUrl,
    price_amount_minor: part.priceAmountMinor,
    currency: part.currency,
    position: part.position,
  }));
}

function mapPart(row: PartRow): OwnedDraftPart | null {
  if (!isPartCategory(row.category)) {
    return null;
  }
  const currency = row.currency;
  if (currency !== null && !isCurrencyCode(currency)) {
    return null;
  }
  return {
    category: row.category,
    name: row.name,
    productUrl: row.product_url,
    priceAmountMinor: row.price_amount_minor,
    currency,
    position: row.position,
  };
}

function mapDraft(row: DraftRow): OwnedDraft | null {
  const watchStyle = row.watch_style;
  const movement = row.movement;
  const dialColour = row.dial_colour;
  const strapType = row.strap_type;
  const handsStyle = row.hands_style;

  if (watchStyle !== null && !isWatchStyle(watchStyle)) {
    return null;
  }
  if (movement !== null && !isMovement(movement)) {
    return null;
  }
  if (dialColour !== null && !isDialColour(dialColour)) {
    return null;
  }
  if (strapType !== null && !isStrapType(strapType)) {
    return null;
  }
  if (handsStyle !== null && !isHandsStyle(handsStyle)) {
    return null;
  }

  const parts = [...(row.build_parts ?? [])]
    .sort((a, b) => a.position - b.position)
    .map(mapPart)
    .filter((part): part is OwnedDraftPart => part !== null);

  return {
    id: row.id,
    name: row.name,
    story: row.story,
    watchStyle,
    movement,
    dialColour,
    strapType,
    handsStyle,
    caseSizeMm: row.case_size_mm,
    mainImagePath: row.main_image_path,
    mainImageUrl: null,
    parts,
  };
}

export function createSupabaseBuildStore(client: BuildsClient): BuildStore {
  return {
    async saveDraft({ id, draft }) {
      const { data, error } = await client.rpc("save_draft_build", {
        p_id: id ?? undefined,
        p_name: draft.name ?? undefined,
        p_story: draft.story ?? undefined,
        p_watch_style: draft.watchStyle ?? undefined,
        p_movement: draft.movement ?? undefined,
        p_dial_colour: draft.dialColour ?? undefined,
        p_strap_type: draft.strapType ?? undefined,
        p_hands_style: draft.handsStyle ?? undefined,
        p_case_size_mm: draft.caseSizeMm ?? undefined,
        p_parts: toRpcParts(draft),
      });

      if (error) {
        mapStoreError(error);
      }

      if (typeof data !== "string" || data === "") {
        return null;
      }

      return { id: data };
    },

    async getOwnedDraft(authorId, id) {
      const { data, error } = await client
        .from("builds")
        .select(
          "id, name, story, watch_style, movement, dial_colour, strap_type, hands_style, case_size_mm, main_image_path, build_parts(category, name, product_url, price_amount_minor, currency, position)",
        )
        .eq("id", id)
        .eq("author_id", authorId)
        .eq("status", "draft")
        .maybeSingle();

      if (error) {
        mapStoreError(error);
      }

      if (!data) {
        return null;
      }

      const mapped = mapDraft(data);
      if (!mapped) {
        return null;
      }

      const mainImageUrl = await previewUrlForOwnedMainImagePath(mapped.mainImagePath, async (path, expiresIn) => {
        const { data: signed, error: signError } = await client.storage
          .from("build-images")
          .createSignedUrl(path, expiresIn);
        if (signError) {
          return null;
        }
        return signed.signedUrl;
      });

      return { ...mapped, mainImageUrl };
    },

    async attachMainImage(authorId, id, path) {
      const { data, error } = await client
        .from("builds")
        .update({ main_image_path: path })
        .eq("id", id)
        .eq("author_id", authorId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

      if (error) {
        mapStoreError(error);
      }

      if (!data) {
        return null;
      }

      return { id: data.id };
    },

    async publishBuild(authorId, id) {
      const { data: updated, error: updateError } = await client
        .from("builds")
        .update({ status: "published" })
        .eq("id", id)
        .eq("author_id", authorId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

      if (updateError) {
        mapStoreError(updateError);
      }

      if (updated) {
        return { id: updated.id };
      }

      const { data: published, error: readError } = await client
        .from("builds")
        .select("id")
        .eq("id", id)
        .eq("author_id", authorId)
        .eq("status", "published")
        .maybeSingle();

      if (readError) {
        mapStoreError(readError);
      }

      if (!published) {
        return null;
      }

      return { id: published.id };
    },
  };
}
