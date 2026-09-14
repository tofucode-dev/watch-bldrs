import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

type BuildsClient = SupabaseClient<Database>;

export async function removeBuildImageBestEffort(client: BuildsClient, path: string | null): Promise<void> {
  if (path === null || path === "") {
    return;
  }

  try {
    await client.storage.from("build-images").remove([path]);
  } catch {
    // Best-effort cleanup; row delete proceeds regardless.
  }
}
