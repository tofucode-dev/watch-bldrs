import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

export async function cleanupBuild(serviceRole: SupabaseClient<Database>, buildId: string): Promise<void> {
  await serviceRole.from("builds").delete().eq("id", buildId);
}
