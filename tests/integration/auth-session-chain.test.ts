/**
 * Cookie-based auth session chain (Risk #4).
 *
 * Requires a running preview/dev server and local Supabase with test users.
 * Start preview in a separate terminal, then run:
 *
 *   TEST_BASE_URL=http://localhost:4321 npm run test:integration -- auth-session-chain
 *
 * Skips when TEST_BASE_URL is unset so CI/local unit runs stay green without a server.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fetchWithCookies, getTestBaseUrl, signIn, signOut } from "./helpers/http-session";
import { createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

const baseUrl = getTestBaseUrl();
const runHttpTests = Boolean(process.env.TEST_BASE_URL);

describe.skipIf(!runHttpTests)("auth session chain via HTTP cookies", () => {
  let identities: TestIdentities;

  beforeAll(async () => {
    identities = await createTestIdentities();

    const probe = await fetch(`${baseUrl}/builds`, { redirect: "manual" });
    if (!probe.ok && probe.status !== 302) {
      throw new Error(
        `No server at ${baseUrl}. Run \`npm run build && npm run preview\` in another terminal, then set TEST_BASE_URL.`,
      );
    }
  });

  afterAll(async () => {
    // identities are ephemeral; no build cleanup required
  });

  it("redirects unauthenticated GET /dashboard to sign-in", async () => {
    const response = await fetchWithCookies(baseUrl, "/dashboard", new Map());

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(/\/auth\/signin/);
  });

  it("allows dashboard access after sign-in and shows the user email", async () => {
    const jar = await signIn(baseUrl, identities.authorA.email, identities.authorA.password);

    const response = await fetchWithCookies(baseUrl, "/dashboard", jar);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(identities.authorA.email);
    expect(html).toContain("My builds");
  });

  it("blocks dashboard again after sign-out", async () => {
    const jar = await signIn(baseUrl, identities.authorA.email, identities.authorA.password);
    await signOut(baseUrl, jar);

    const response = await fetchWithCookies(baseUrl, "/dashboard", jar);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(/\/auth\/signin/);
  });
});
