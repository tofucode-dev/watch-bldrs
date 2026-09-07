import { spawn } from "node:child_process";
import process from "node:process";

process.env.CLOUDFLARE_ENV ??= "local";

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
