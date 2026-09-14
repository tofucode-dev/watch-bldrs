import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const routePath = join(dirname(fileURLToPath(import.meta.url)), "index.astro");
const routeSource = readFileSync(routePath, "utf8");

describe("/builds route contract", () => {
  it("disables prerendering for SSR", () => {
    expect(routeSource).toMatch(/export const prerender = false/);
  });

  it("uses the catalog server entrypoint without direct Supabase imports", () => {
    expect(routeSource).toContain('@/modules/catalog/server');
    expect(routeSource).not.toMatch(/@\/lib\/supabase/);
    expect(routeSource).not.toMatch(/createClient/);
    expect(routeSource).not.toMatch(/client:/);
  });
});
