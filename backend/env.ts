// Minimal .env loader — avoids pulling in a dependency for one file. Reads
// backend/.env (gitignored, not present in a fresh checkout) and sets any
// KEY=value line into process.env that isn't already set there, so a real
// environment variable always wins over the file.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { serverRoot } from "./paths.ts";

const envPath = path.join(serverRoot, ".env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
