// eslint-disable-next-line no-control-regex -- reject ASCII control characters in return-to paths
const CONTROL_OR_WHITESPACE = /[\u0000-\u001F\u007F\s]/;

export function safeRedirect(value: string | null | undefined, origin: string): string {
  if (typeof value !== "string" || value === "") {
    return "/";
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || CONTROL_OR_WHITESPACE.test(value)) {
    return "/";
  }

  let parsed: URL;
  try {
    parsed = new URL(value, origin);
  } catch {
    return "/";
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(origin).origin;
  } catch {
    return "/";
  }

  if (parsed.origin !== expectedOrigin || !parsed.pathname.startsWith("/")) {
    return "/";
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
