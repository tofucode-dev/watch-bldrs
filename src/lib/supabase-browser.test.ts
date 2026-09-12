import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateBrowserClient = vi.fn(() => ({ auth: {} }));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

describe("createBrowserSupabaseClient", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateBrowserClient.mockClear();
  });

  it("returns null when public Supabase env vars are missing", async () => {
    vi.doMock("astro:env/client", () => ({
      PUBLIC_SUPABASE_URL: undefined,
      PUBLIC_SUPABASE_KEY: undefined,
    }));

    const { createBrowserSupabaseClient } = await import("./supabase-browser");
    expect(createBrowserSupabaseClient()).toBeNull();
    expect(mockCreateBrowserClient).not.toHaveBeenCalled();
  });

  it("creates a browser client when public Supabase env is configured", async () => {
    vi.doMock("astro:env/client", () => ({
      PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      PUBLIC_SUPABASE_KEY: "test-anon-key",
    }));

    const { createBrowserSupabaseClient } = await import("./supabase-browser");
    const client = createBrowserSupabaseClient();

    expect(client).not.toBeNull();
    expect(mockCreateBrowserClient).toHaveBeenCalledOnce();
    expect(mockCreateBrowserClient).toHaveBeenCalledWith("https://example.supabase.co", "test-anon-key");
  });
});
