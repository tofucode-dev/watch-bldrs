const DEFAULT_BASE_URL = "http://localhost:4321";

export type CookieJar = Map<string, string>;

export function getTestBaseUrl(): string {
  return process.env.TEST_BASE_URL ?? DEFAULT_BASE_URL;
}

function requestOrigin(baseUrl: string): string {
  return new URL(baseUrl).origin;
}

function readSetCookieHeaders(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

export function mergeCookies(jar: CookieJar, response: Response): void {
  for (const header of readSetCookieHeaders(response)) {
    const [pair] = header.split(";");
    const separator = pair.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (value === "") {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
}

function cookieHeader(jar: CookieJar): string | undefined {
  if (jar.size === 0) {
    return undefined;
  }

  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

export async function signIn(baseUrl: string, email: string, password: string): Promise<CookieJar> {
  const jar: CookieJar = new Map();
  const body = new URLSearchParams({ email, password, redirect: "/dashboard" });

  const response = await fetch(`${baseUrl}/api/auth/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: requestOrigin(baseUrl),
    },
    body: body.toString(),
    redirect: "manual",
  });

  mergeCookies(jar, response);

  if (response.status >= 400) {
    const text = await response.text();
    throw new Error(`Sign-in failed (${response.status}): ${text.slice(0, 200)}`);
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (location?.includes("/auth/signin")) {
      throw new Error(`Sign-in rejected — check credentials and Supabase config (${location})`);
    }
  }

  return jar;
}

export async function signOut(baseUrl: string, jar: CookieJar): Promise<void> {
  const cookies = cookieHeader(jar);
  const response = await fetch(`${baseUrl}/api/auth/signout`, {
    method: "POST",
    headers: {
      Origin: requestOrigin(baseUrl),
      ...(cookies ? { Cookie: cookies } : {}),
    },
    redirect: "manual",
  });

  mergeCookies(jar, response);
}

export async function fetchWithCookies(
  baseUrl: string,
  path: string,
  jar: CookieJar,
  init: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);

  const cookies = cookieHeader(jar);
  if (cookies) {
    headers.set("Cookie", cookies);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    redirect: "manual",
  });

  mergeCookies(jar, response);
  return response;
}
