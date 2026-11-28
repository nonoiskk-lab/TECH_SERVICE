// Vercel build entry. Only PRODUCTION builds run database migrations.
// Preview builds share the production DATABASE_URL until a staging database exists
// (docs/v4 F-04), so they must never migrate it.
import { spawnSync } from "node:child_process";

const env = process.env.VERCEL_ENV;
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (env === "production") {
  console.log("[vercel-build] production: prisma migrate deploy");
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log(`[vercel-build] VERCEL_ENV=${env ?? "unset"}: skipping migrations`);
}
run("npx", ["next", "build"]);
