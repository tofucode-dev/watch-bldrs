import type { AstroCookies } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServerClient = vi.fn(() => ({ auth: {} }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
  parseCookieHeader: vi.fn(() => []),
}));

function mockCookies(): AstroCookies {
  return { set: vi.fn() } as unknown as AstroCookies;
}

describe("createClient", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateServerClient.mockClear();
  });

  it("returns null when Supabase env vars are missing", async () => {
    vi.doMock("astro:env/server", () => ({
      SUPABASE_URL: undefined,
      SUPABASE_KEY: undefined,
    }));

    const { createClient } = await import("./supabase");
    expect(createClient(new Headers(), mockCookies())).toBeNull();
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it("creates a server client when Supabase is configured", async () => {
    vi.doMock("astro:env/server", () => ({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_KEY: "test-anon-key",
    }));

    const { createClient } = await import("./supabase");
    const client = createClient(new Headers(), mockCookies());

    expect(client).not.toBeNull();
    expect(mockCreateServerClient).toHaveBeenCalledOnce();
    const [url, key, options] = mockCreateServerClient.mock.calls[0] as [
      string,
      string,
      { cookies: { getAll: () => unknown; setAll: (cookies: unknown) => void } },
    ];
    expect(url).toBe("https://example.supabase.co");
    expect(key).toBe("test-anon-key");
    expect(typeof options.cookies.getAll).toBe("function");
    expect(typeof options.cookies.setAll).toBe("function");
  });
});
