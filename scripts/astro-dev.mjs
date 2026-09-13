import { spawn } from "node:child_process";
import process from "node:process";

process.env.CLOUDFLARE_ENV ??= "local";

// Cloudflare Vite dev can OOM on default Node heap when Actions deps optimize mid-request.
if (!process.env.NODE_OPTIONS?.includes("max-old-space-size")) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--max-old-space-size=4096"].filter(Boolean).join(" ");
}

const child = spawn("npx", ["astro", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
