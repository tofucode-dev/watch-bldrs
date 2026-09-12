import { createBrowserClient } from "@supabase/ssr";
import { PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from "astro:env/client";

export function createBrowserSupabaseClient() {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_KEY) {
    return null;
  }

  return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY);
}
