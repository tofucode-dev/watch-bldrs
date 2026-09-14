import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import type { Database } from "../../../src/lib/database.types";

export interface TestIdentity {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient<Database>;
}

export interface TestIdentities {
  anon: SupabaseClient<Database>;
  authorA: TestIdentity;
  userB: TestIdentity;
  serviceRole: SupabaseClient<Database>;
}

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";

function parseSupabaseStatusEnv(): Record<string, string> {
  try {
    const output = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return Object.fromEntries(
      output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const idx = line.indexOf("=");
          if (idx === -1) return null;
          const key = line.slice(0, idx);
          const value = line.slice(idx + 1).replace(/^"|"$/g, "");
          return [key, value] as const;
        })
        .filter((entry): entry is readonly [string, string] => entry !== null),
    );
  } catch {
    return {};
  }
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Start local Supabase with \`npx supabase start\` and run \`npx supabase db reset\` before integration tests.`,
    );
  }
  return value;
}

async function createAuthUser(serviceRole: SupabaseClient<Database>, email: string, password: string): Promise<string> {
  const { data, error } = await serviceRole.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    throw new Error(`Failed to create test user ${email}: ${error.message}`);
  }
  return data.user.id;
}

async function signInClient(
  url: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Failed to sign in ${email}: ${error.message}`);
  }
  return client;
}

export async function createTestIdentities(): Promise<TestIdentities> {
  const statusEnv = parseSupabaseStatusEnv();
  const url = statusEnv.SUPABASE_URL || LOCAL_SUPABASE_URL;
  const anonKey = requireEnv("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY ?? statusEnv.ANON_KEY);
  const serviceRoleKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? statusEnv.SERVICE_ROLE_KEY,
  );

  const serviceRole = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = "integration-test-password-123";
  const authorEmail = `author-a-${suffix}@example.com`;
  const userBEmail = `user-b-${suffix}@example.com`;

  const authorAId = await createAuthUser(serviceRole, authorEmail, password);
  const userBId = await createAuthUser(serviceRole, userBEmail, password);

  const authorAClient = await signInClient(url, anonKey, authorEmail, password);
  const userBClient = await signInClient(url, anonKey, userBEmail, password);

  const anon = createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return {
    anon,
    authorA: {
      id: authorAId,
      email: authorEmail,
      password,
      client: authorAClient,
    },
    userB: {
      id: userBId,
      email: userBEmail,
      password,
      client: userBClient,
    },
    serviceRole,
  };
}

export const CATALOG_DEMO_EMAIL = "catalog-demo@example.com";

export async function cleanupBuild(serviceRole: SupabaseClient<Database>, buildId: string): Promise<void> {
  await serviceRole.from("builds").delete().eq("id", buildId);
}

/** Seeds status=published with published_at=null; bypasses set_build_published_at for catalog invariant tests. */
export function seedInconsistentPublishedBuild(authorId: string): string {
  const buildId = randomUUID();
  const sql = [
    "DO $seed$",
    "BEGIN",
    "ALTER TABLE public.builds DISABLE TRIGGER builds_set_published_at;",
    "INSERT INTO public.builds (id, author_id, status, name, published_at, watch_style, movement)",
    `VALUES ('${buildId}', '${authorId}', 'published', 'Published without timestamp', NULL, 'diver', 'nh35');`,
    "ALTER TABLE public.builds ENABLE TRIGGER builds_set_published_at;",
    "END",
    "$seed$;",
  ].join(" ");

  execSync(`npx supabase db query --local ${JSON.stringify(sql)}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return buildId;
}

export async function clearCatalogDemoData(serviceRole: SupabaseClient<Database>): Promise<void> {
  const { data, error } = await serviceRole.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    throw new Error(`Failed to list users while clearing catalog demo data: ${error.message}`);
  }

  const demoUserId = data.users.find((user) => user.email === CATALOG_DEMO_EMAIL)?.id;
  if (!demoUserId) {
    return;
  }

  const { data: builds, error: buildsError } = await serviceRole
    .from("builds")
    .select("id, main_image_path")
    .eq("author_id", demoUserId);
  if (buildsError) {
    throw new Error(`Failed to list catalog demo builds: ${buildsError.message}`);
  }

  const imagePaths = builds
    .map((build) => build.main_image_path)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (imagePaths.length > 0) {
    const { error: storageError } = await serviceRole.storage.from("build-images").remove(imagePaths);
    if (storageError) {
      throw new Error(`Failed to remove catalog demo images: ${storageError.message}`);
    }
  }

  const { error: deleteError } = await serviceRole.from("builds").delete().eq("author_id", demoUserId);
  if (deleteError) {
    throw new Error(`Failed to delete catalog demo builds: ${deleteError.message}`);
  }
}
