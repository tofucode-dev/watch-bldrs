import { defineMiddleware } from "astro:middleware";
import { createClient } from "@/lib/supabase";

const PROTECTED_ROUTES = ["/dashboard", "/account"];

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  const supabase = createClient(context.request.headers, context.cookies);

  context.locals.user = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ?? null;
  }

  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!context.locals.user) {
      const redirectTarget = `${pathname}${context.url.search}`;

      return context.redirect(`/auth/signin?redirect=${encodeURIComponent(redirectTarget)}`);
    }
  }

  const response = await next();

  return response;
});
