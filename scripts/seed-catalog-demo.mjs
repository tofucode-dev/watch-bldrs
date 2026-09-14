import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEMO_EMAIL = "catalog-demo@example.com";
const DEMO_PASSWORD = "catalog-demo-password";
const DEFAULT_IMAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "images.jpg");

const CATALOG_DEMO_BUILDS = [
  {
    name: "Grand Seiko Spring Drive GMT",
    watch_style: "gmt",
    movement: "other",
    dial_colour: "green",
    strap_type: "steel_bracelet",
    case_size_mm: 40,
    status: "published",
    daysAgo: 0,
  },
  {
    name: "NH35 Sub Homage",
    watch_style: "diver",
    movement: "nh35",
    dial_colour: "blue",
    strap_type: "rubber",
    case_size_mm: 40,
    status: "published",
    daysAgo: 0,
  },
  {
    name: "Field Explorer",
    watch_style: "field",
    movement: "nh36",
    dial_colour: "black",
    strap_type: "nato",
    case_size_mm: 38,
    status: "published",
    daysAgo: 1,
  },
  {
    name: "Dress Dauphine",
    watch_style: "dress",
    movement: "miyota_8215",
    dial_colour: "silver",
    strap_type: "leather",
    case_size_mm: 39,
    status: "published",
    daysAgo: 1,
  },
  {
    name: "GMT Traveller",
    watch_style: "gmt",
    movement: "nh34",
    dial_colour: "blue",
    strap_type: "steel_bracelet",
    case_size_mm: 40,
    status: "published",
    daysAgo: 2,
  },
  {
    name: "Pilot Flieger",
    watch_style: "pilot",
    movement: "nh35",
    dial_colour: "black",
    strap_type: "leather",
    case_size_mm: 42,
    status: "published",
    daysAgo: 2,
  },
  {
    name: "Integrated Bracelet Build",
    watch_style: "integrated",
    movement: "nh35",
    dial_colour: "green",
    strap_type: "steel_bracelet",
    case_size_mm: 40,
    status: "published",
    daysAgo: 3,
  },
  {
    name: "White Dial Diver",
    watch_style: "diver",
    movement: "nh36",
    dial_colour: "white",
    strap_type: "rubber",
    case_size_mm: 41,
    status: "published",
    daysAgo: 4,
  },
  {
    name: "Green Dial Field",
    watch_style: "field",
    movement: "nh35",
    dial_colour: "green",
    strap_type: "nato",
    case_size_mm: 38,
    status: "published",
    daysAgo: 5,
  },
  {
    name: "Silver Dress Build",
    watch_style: "dress",
    movement: "miyota_8215",
    dial_colour: "silver",
    strap_type: "leather",
    case_size_mm: 37,
    status: "published",
    daysAgo: 6,
  },
  {
    name: "Blue GMT",
    watch_style: "gmt",
    movement: "nh34",
    dial_colour: "blue",
    strap_type: "steel_bracelet",
    case_size_mm: 40,
    status: "published",
    daysAgo: 7,
  },
  {
    name: "Pilot NATO",
    watch_style: "pilot",
    movement: "nh35",
    dial_colour: "black",
    strap_type: "nato",
    case_size_mm: 42,
    status: "published",
    daysAgo: 8,
  },
  {
    name: "Rubber Diver",
    watch_style: "diver",
    movement: "nh36",
    dial_colour: "black",
    strap_type: "rubber",
    case_size_mm: 41,
    status: "published",
    daysAgo: 9,
  },
  {
    name: "Bench Experiment",
    watch_style: "other",
    movement: "other",
    dial_colour: "other",
    strap_type: "other",
    case_size_mm: 40,
    status: "published",
    daysAgo: 10,
  },
  {
    name: "Private Draft — Should Not Appear In Catalog",
    watch_style: "diver",
    movement: "nh35",
    dial_colour: "black",
    strap_type: "steel_bracelet",
    case_size_mm: 41,
    status: "draft",
    daysAgo: null,
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

function assertLocalSupabaseUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid Supabase URL: ${url}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1") {
    throw new Error(`Refusing to seed catalog demo data against non-local Supabase URL (${hostname}).`);
  }
}

function parseArgs(argv) {
  const imageFlagIndex = argv.indexOf("--image");
  if (imageFlagIndex === -1) {
    return { imagePath: DEFAULT_IMAGE };
  }

  const imagePath = argv[imageFlagIndex + 1];
  if (!imagePath) {
    throw new Error("Pass a file path after --image");
  }

  return { imagePath: path.resolve(imagePath) };
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

  const imagePaths = (builds ?? [])
    .map((build) => build.main_image_path)
    .filter((value) => typeof value === "string" && value.length > 0);

  if (imagePaths.length > 0) {
    const { error: storageError } = await serviceRole.storage.from("build-images").remove(imagePaths);
    if (storageError) {
      throw new Error(`Failed to remove demo images: ${storageError.message}`);
    }
  }

  const { error: deleteError } = await serviceRole.from("builds").delete().eq("author_id", authorId);
  if (deleteError) {
    throw new Error(`Failed to delete demo builds: ${deleteError.message}`);
  }
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

async function seedBuild(serviceRole, authorId, seed, imageBytes, imagePath) {
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
      story: seed.status === "published" ? "Seeded catalog demo build for local browsing." : null,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to insert build "${seed.name}": ${insertError.message}`);
  }

  let mainImagePath = null;

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

async function main() {
  const { imagePath } = parseArgs(process.argv.slice(2));
  const statusEnv = parseSupabaseStatusEnv();
  const url = statusEnv.API_URL || statusEnv.SUPABASE_URL || "http://127.0.0.1:54321";
  assertLocalSupabaseUrl(url);
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

  let imageBytes = null;
  if (existsSync(imagePath)) {
    imageBytes = readFileSync(imagePath);
    console.log(`Using image: ${imagePath}`);
  } else {
    console.warn(`No image found at ${imagePath}. Seeding published builds without photos.`);
    console.warn("Save your watch photo there or rerun with: npm run db:seed-catalog-demo -- --image <path>");
  }

  const authorId = await ensureDemoUser(serviceRole);
  const buildIds = [];

  for (const seed of CATALOG_DEMO_BUILDS) {
    const buildId = await seedBuild(serviceRole, authorId, seed, imageBytes, imagePath);
    buildIds.push(buildId);
  }

  const publishedCount = CATALOG_DEMO_BUILDS.filter((seed) => seed.status === "published").length;
  console.log("");
  console.log("Catalog demo data ready.");
  console.log(`- Demo author: ${DEMO_EMAIL}`);
  console.log("- Password:    not printed; see DEMO_PASSWORD in scripts/seed-catalog-demo.mjs");
  console.log(`- Published:   ${publishedCount} builds`);
  console.log(`- Draft:       1 build (hidden from catalog)`);
  console.log(`- Images:      ${imageBytes ? "uploaded for published builds" : "none"}`);
  console.log("");
  console.log("Open /builds after the catalog page lands.");
  console.log("Note: catalog integration tests clear this demo data automatically before they run.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
