/**
 * Worker-shaped HTTP smoke checks (Risk #7).
 *
 * Run against a built preview server:
 *   npm run build && npm run preview
 *   BASE_URL=http://localhost:4321 npm run preview:smoke
 */
import process from "node:process";

const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:4321").replace(/\/$/, "");
const FETCH_TIMEOUT_MS = 5_000;

function fail(message) {
  console.error(`preview-smoke: ${message}`);
  process.exitCode = 1;
}

async function fetchWithTimeout(url, init = {}) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms — is preview running at ${baseUrl}?`);
    }
    throw error;
  }
}

async function expectStatus(path, expectedStatus) {
  const url = `${baseUrl}${path}`;
  const response = await fetchWithTimeout(url, { redirect: "manual" });

  if (response.status !== expectedStatus) {
    fail(`${path} expected HTTP ${expectedStatus}, got ${response.status}`);
    return null;
  }

  return response;
}

async function main() {
  let failed = false;

  const catalogResponse = await expectStatus("/builds", 200);
  if (catalogResponse) {
    const body = await catalogResponse.text();
    const hasCatalogMarker =
      body.includes("Builds") ||
      body.includes("No published builds yet") ||
      body.includes("No published builds match the selected filters");
    if (!hasCatalogMarker) {
      fail("/builds response missing catalog page markers");
      failed = true;
    }
  } else {
    failed = true;
  }

  const dashboardResponse = await expectStatus("/dashboard", 302);
  if (dashboardResponse) {
    const location = dashboardResponse.headers.get("location") ?? "";
    if (!location.includes("/auth/signin")) {
      fail(`/dashboard redirect expected /auth/signin, got ${location}`);
      failed = true;
    }
  } else {
    failed = true;
  }

  const rootResponse = await expectStatus("/", 302);
  if (rootResponse) {
    const location = rootResponse.headers.get("location") ?? "";
    if (!location.includes("/builds")) {
      fail(`/ redirect expected /builds, got ${location}`);
      failed = true;
    }
  } else {
    failed = true;
  }

  if (failed || process.exitCode === 1) {
    process.exit(1);
  }

  console.log(`preview-smoke: OK (${baseUrl})`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
