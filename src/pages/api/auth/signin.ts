import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { safeRedirect } from "@/lib/safe-redirect";

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;
  const redirectValue = form.get("redirect");
  const redirectTo = safeRedirect(typeof redirectValue === "string" ? redirectValue : null, context.url.origin);

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent("Supabase is not configured")}`);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const redirectQuery = redirectTo === "/" ? "" : `&redirect=${encodeURIComponent(redirectTo)}`;
    return context.redirect(`/auth/signin?error=${encodeURIComponent(error.message)}${redirectQuery}`);
  }

  return context.redirect(redirectTo);
};
