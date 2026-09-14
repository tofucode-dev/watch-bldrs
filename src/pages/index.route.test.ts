import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const routePath = join(dirname(fileURLToPath(import.meta.url)), "index.astro");
const routeSource = readFileSync(routePath, "utf8");

describe("/ route contract", () => {
  it("disables prerendering for SSR", () => {
    expect(routeSource).toMatch(/export const prerender = false/);
  });

  it("redirects to the public catalog", () => {
    expect(routeSource).toContain('Astro.redirect("/builds")');
  });
});
