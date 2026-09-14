import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEMO_EMAIL = "catalog-demo@example.com";
const DEMO_PASSWORD = "catalog-demo-password";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MOCKS_DIR = path.join(SCRIPT_DIR, "fixtures", "mocks");
const DEFAULT_IMAGE = path.join(SCRIPT_DIR, "..", "public", "images.jpg");
const COPIES_PER_MOCK = 3;

const DIAL_COLOURS = ["black", "white", "blue", "green", "silver", "other"];

const STORY_SNIPPETS = [
  "Built for daily wear with a focus on legibility and comfort.",
  "A weekend mod that turned into my favorite wrist companion.",
  "Assembled from off-the-shelf parts for a cleaner dial presence.",
  "Tuned for balance on the wrist and easy strap swaps.",
  "Inspired by classic references, finished with modern proportions.",
  "Dial and hands chosen for contrast in low light.",
];

/** @type {Array<{ name: string; watch_style: string; movement: string; case_size_mm: number; strap_type: string; image: string }>} */
const MOCK_BUILD_TEMPLATES = [
  {
    name: "Backcountry Field",
    watch_style: "field",
    movement: "nh35",
    case_size_mm: 38,
    strap_type: "nato",
    image: "mock_1.png",
  },
  {
    name: "Deepwater Explorer",
    watch_style: "diver",
    movement: "nh35",
    case_size_mm: 40,
    strap_type: "steel_bracelet",
    image: "mock_2.png",
  },
  {
    name: "Ember GMT",
    watch_style: "gmt",
    movement: "nh34",
    case_size_mm: 40,
    strap_type: "steel_bracelet",
    image: "mock_3.png",
  },
  {
    name: "Midnight Dress",
    watch_style: "dress",
    movement: "other",
    case_size_mm: 39,
    strap_type: "leather",
    image: "mock_4.png",
  },
  {
    name: "Integrated Blue",
    watch_style: "integrated",
    movement: "nh35",
    case_size_mm: 40,
    strap_type: "steel_bracelet",
    image: "mock_5.png",
  },
  {
    name: "Desert Pilot",
    watch_style: "pilot",
    movement: "nh35",
    case_size_mm: 42,
    strap_type: "leather",
    image: "mock_6.png",
  },
  {
    name: "Bronze Expedition",
    watch_style: "field",
    movement: "other",
    case_size_mm: 41,
    strap_type: "other",
    image: "mock_7.png",
  },
  {
    name: "Silver Sector",
    watch_style: "dress",
    movement: "other",
    case_size_mm: 38,
    strap_type: "leather",
    image: "mock_8.png",
  },
  {
    name: "Trackside Chronograph",
    watch_style: "other",
    movement: "other",
    case_size_mm: 40,
    strap_type: "leather",
    image: "mock_9.png",
  },
  {
    name: "Snowfield Minimal",
    watch_style: "other",
    movement: "other",
    case_size_mm: 36,
    strap_type: "other",
    image: "mock_10.png",
  },
];

function pickBySeed(values, seed) {
  return values[((seed % values.length) + values.length) % values.length];
}

function buildName(templateName, copyIndex) {
  if (copyIndex === 0) {
    return templateName;
  }

  return `${templateName} · ${copyIndex + 1}`;
}

function expandMockBuilds(mocksDir) {
  /** @type {Array<{ name: string; watch_style: string; movement: string; dial_colour: string; strap_type: string; case_size_mm: number; status: "published"; daysAgo: number; story: string; imagePath: string }>} */
  const builds = [];
  let daysAgo = 0;

  for (const [templateIndex, template] of MOCK_BUILD_TEMPLATES.entries()) {
    const imagePath = path.join(mocksDir, template.image);

    for (let copyIndex = 0; copyIndex < COPIES_PER_MOCK; copyIndex += 1) {
      const seed = templateIndex * COPIES_PER_MOCK + copyIndex;

      builds.push({
        name: buildName(template.name, copyIndex),
        watch_style: template.watch_style,
        movement: template.movement,
        dial_colour: pickBySeed(DIAL_COLOURS, seed + templateIndex + 1),
        strap_type: template.strap_type,
        case_size_mm: template.case_size_mm,
        status: "published",
        daysAgo,
        story: pickBySeed(STORY_SNIPPETS, seed + 3),
        imagePath,
      });

      daysAgo += 1;
    }
  }

  return builds;
}

const CATALOG_DEMO_BUILDS = [
  ...expandMockBuilds(DEFAULT_MOCKS_DIR),
  {
    name: "Private Draft — Should Not Appear In Catalog",
    watch_style: "diver",
    movement: "nh35",
    dial_colour: "black",
    strap_type: "steel_bracelet",
    case_size_mm: 41,
    status: "draft",
    daysAgo: null,
    story: null,
    imagePath: path.join(DEFAULT_MOCKS_DIR, "mock_2.png"),
  },
];

function parseSupabaseStatusEnv() {
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
          return [key, value];
        })
        .filter(Boolean),
    );
  } catch {
    return {};
  }
}

function requireEnv(name, value) {
  if (!value) {
    throw new Error(
      `Missing ${name}. Start local Supabase with \`npx supabase start\` and run \`npx supabase db reset\` if needed.`,
    );
  }
  return value;
}

function isLocalSupabaseUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function assertSeedTargetAllowed(url, allowRemote) {
  if (allowRemote || isLocalSupabaseUrl(url)) {
    return;
  }

  let hostname = url;
  try {
    hostname = new URL(url).hostname;
  } catch {
    // Keep the raw URL in the error message.
  }

  throw new Error(
    `Refusing to seed catalog demo data against non-local Supabase URL (${hostname}). Pass --allow-remote when targeting hosted Supabase.`,
  );
}

/**
 * @param {string[]} argv
 * @returns {{ mocksDir: string, fallbackImagePath: string | null, allowRemote: boolean }}
 */
function parseArgs(argv) {
  /** @type {{ mocksDir: string, fallbackImagePath: string | null, allowRemote: boolean }} */
  const options = {
    mocksDir: DEFAULT_MOCKS_DIR,
    fallbackImagePath: null,
    allowRemote: process.env.SEED_ALLOW_REMOTE === "true",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--allow-remote") {
      options.allowRemote = true;
      continue;
    }

    if (arg === "--mocks-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Pass a directory path after --mocks-dir");
      }
      options.mocksDir = path.resolve(value);
      index += 1;
      continue;
    }

    if (arg === "--image") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Pass a file path after --image");
      }
      options.fallbackImagePath = path.resolve(value);
      index += 1;
    }
  }

  return options;
}

function contentTypeForPath(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  throw new Error(`Unsupported image extension: ${ext}`);
}

function storageExtensionForPath(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === ".png") return "png";
  if (ext === ".jpg" || ext === ".jpeg") return "jpg";
  if (ext === ".webp") return "webp";
  throw new Error(`Unsupported image extension: ${ext}`);
}

function publishedAtForDaysAgo(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString();
}

function loadImageBytes(imagePath, cache) {
  if (!imagePath || !existsSync(imagePath)) {
    return null;
  }

  if (cache.has(imagePath)) {
    return cache.get(imagePath);
  }

  const bytes = readFileSync(imagePath);
  cache.set(imagePath, bytes);
  return bytes;
}

async function findDemoUserId(serviceRole) {
  const { data, error } = await serviceRole.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return data.users.find((user) => user.email === DEMO_EMAIL)?.id ?? null;
}

async function clearDemoData(serviceRole, authorId) {
  const { data: builds, error } = await serviceRole
    .from("builds")
    .select("id, main_image_path")
    .eq("author_id", authorId);
  if (error) {
    throw new Error(`Failed to list demo builds: ${error.message}`);
  }

  await removeBuildImages(serviceRole, builds ?? []);
  await deleteBuildRows(
    serviceRole,
    (builds ?? []).map((build) => build.id),
  );
}

async function removeBuildImages(serviceRole, builds) {
  const imagePaths = builds
    .map((build) => build.main_image_path)
    .filter((value) => typeof value === "string" && value.length > 0);

  if (imagePaths.length === 0) {
    return;
  }

  const { error: storageError } = await serviceRole.storage.from("build-images").remove(imagePaths);
  if (storageError) {
    throw new Error(`Failed to remove build images: ${storageError.message}`);
  }
}

async function deleteBuildRows(serviceRole, buildIds) {
  if (buildIds.length === 0) {
    return;
  }

  const { error: deleteError } = await serviceRole.from("builds").delete().in("id", buildIds);
  if (deleteError) {
    throw new Error(`Failed to delete builds: ${deleteError.message}`);
  }
}

async function clearAllBuilds(serviceRole) {
  const { data: builds, error } = await serviceRole.from("builds").select("id, main_image_path");
  if (error) {
    throw new Error(`Failed to list builds for reset: ${error.message}`);
  }

  await removeBuildImages(serviceRole, builds ?? []);
  await deleteBuildRows(
    serviceRole,
    (builds ?? []).map((build) => build.id),
  );
}

async function ensureDemoUser(serviceRole) {
  const existingId = await findDemoUserId(serviceRole);
  if (existingId) {
    await clearDemoData(serviceRole, existingId);
    return existingId;
  }

  const { data, error } = await serviceRole.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create demo user: ${error.message}`);
  }

  return data.user.id;
}

async function seedBuild(serviceRole, authorId, seed, imageCache, fallbackImagePath) {
  const publishedAt = seed.status === "published" && seed.daysAgo !== null ? publishedAtForDaysAgo(seed.daysAgo) : null;

  const { data: build, error: insertError } = await serviceRole
    .from("builds")
    .insert({
      author_id: authorId,
      status: "draft",
      name: seed.name,
      watch_style: seed.watch_style,
      movement: seed.movement,
      dial_colour: seed.dial_colour,
      strap_type: seed.strap_type,
      case_size_mm: seed.case_size_mm,
      story: seed.status === "published" ? seed.story : null,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to insert build "${seed.name}": ${insertError.message}`);
  }

  let mainImagePath = null;
  const primaryImagePath = seed.imagePath ?? fallbackImagePath;
  let imagePath = primaryImagePath;
  let imageBytes = loadImageBytes(imagePath, imageCache);

  if (!imageBytes && fallbackImagePath && imagePath !== fallbackImagePath) {
    imagePath = fallbackImagePath;
    imageBytes = loadImageBytes(imagePath, imageCache);
  }

  if (imageBytes && seed.status === "published") {
    const extension = storageExtensionForPath(imagePath);
    mainImagePath = `${authorId}/${build.id}/main.${extension}`;
    const { error: uploadError } = await serviceRole.storage.from("build-images").upload(mainImagePath, imageBytes, {
      contentType: contentTypeForPath(imagePath),
      upsert: true,
    });

    if (uploadError) {
      throw new Error(`Failed to upload image for "${seed.name}": ${uploadError.message}`);
    }
  }

  if (seed.status === "published") {
    const { error: publishError } = await serviceRole
      .from("builds")
      .update({
        status: "published",
        published_at: publishedAt,
        main_image_path: mainImagePath,
      })
      .eq("id", build.id);

    if (publishError) {
      throw new Error(`Failed to publish build "${seed.name}": ${publishError.message}`);
    }
  }

  return build.id;
}

function resolveCatalogDemoBuilds(mocksDir, fallbackImagePath) {
  if (mocksDir === DEFAULT_MOCKS_DIR && !fallbackImagePath) {
    return CATALOG_DEMO_BUILDS;
  }

  const publishedBuilds = expandMockBuilds(mocksDir);
  return [
    ...publishedBuilds,
    {
      name: "Private Draft — Should Not Appear In Catalog",
      watch_style: "diver",
      movement: "nh35",
      dial_colour: "black",
      strap_type: "steel_bracelet",
      case_size_mm: 41,
      status: "draft",
      daysAgo: null,
      story: null,
      imagePath: fallbackImagePath ?? path.join(mocksDir, "mock_2.png"),
    },
  ];
}

function resolveSupabaseUrl(statusEnv, allowRemote) {
  if (allowRemote && process.env.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }

  if (isLocalSupabaseUrl(process.env.SUPABASE_URL ?? "")) {
    return process.env.SUPABASE_URL;
  }

  return statusEnv.API_URL || statusEnv.SUPABASE_URL || process.env.SUPABASE_URL || "http://127.0.0.1:54321";
}

async function main() {
  const { mocksDir, fallbackImagePath, allowRemote } = parseArgs(process.argv.slice(2));
  const statusEnv = parseSupabaseStatusEnv();
  const url = resolveSupabaseUrl(statusEnv, allowRemote);
  assertSeedTargetAllowed(url, allowRemote);
  const serviceRoleKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY || statusEnv.SERVICE_ROLE_KEY,
  );

  const serviceRole = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  if (allowRemote) {
    console.log("Remote seed enabled: clearing all builds before re-seeding demo catalog.");
    await clearAllBuilds(serviceRole);
  }

  const catalogDemoBuilds = resolveCatalogDemoBuilds(mocksDir, fallbackImagePath);
  const imageCache = new Map();
  const uniqueImagePaths = [...new Set(catalogDemoBuilds.map((seed) => seed.imagePath).filter(Boolean))];
  const resolvedFallbackImagePath = fallbackImagePath ?? (existsSync(DEFAULT_IMAGE) ? DEFAULT_IMAGE : null);

  for (const imagePath of uniqueImagePaths) {
    if (existsSync(imagePath)) {
      loadImageBytes(imagePath, imageCache);
      console.log(`Loaded mock image: ${imagePath}`);
    } else {
      console.warn(`Missing mock image: ${imagePath}`);
    }
  }

  if (imageCache.size === 0 && resolvedFallbackImagePath && existsSync(resolvedFallbackImagePath)) {
    loadImageBytes(resolvedFallbackImagePath, imageCache);
    console.log(`Using fallback image: ${resolvedFallbackImagePath}`);
  } else if (imageCache.size === 0) {
    console.warn("No mock images found. Seeding published builds without photos.");
    console.warn("Add PNGs to scripts/fixtures/mocks/ or rerun with: npm run db:seed-catalog-demo -- --image <path>");
  }

  const authorId = await ensureDemoUser(serviceRole);
  const buildIds = [];

  for (const seed of catalogDemoBuilds) {
    const buildId = await seedBuild(serviceRole, authorId, seed, imageCache, resolvedFallbackImagePath);
    buildIds.push(buildId);
  }

  const publishedCount = catalogDemoBuilds.filter((seed) => seed.status === "published").length;
  const uploadedImageCount = catalogDemoBuilds.filter(
    (seed) => seed.status === "published" && seed.imagePath && imageCache.has(seed.imagePath),
  ).length;

  console.log("");
  console.log("Catalog demo data ready.");
  console.log(`- Supabase:    ${url}`);
  console.log(`- Demo author: ${DEMO_EMAIL}`);
  console.log("- Password:    not printed; see DEMO_PASSWORD in scripts/seed-catalog-demo.mjs");
  console.log(`- Published:   ${publishedCount} builds (${MOCK_BUILD_TEMPLATES.length} mocks x${COPIES_PER_MOCK})`);
  console.log(`- Draft:       1 build (hidden from catalog)`);
  console.log(`- Images:      ${uploadedImageCount} published builds with photos`);
  console.log("");
  console.log("Open /builds after the catalog page lands.");
  console.log("Note: catalog integration tests clear this demo data automatically before they run.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
