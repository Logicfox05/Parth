import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const serverRoot = __dirname;
export const repoRoot = path.resolve(__dirname, "..");
export const dataDir = path.join(__dirname, "data");
// The built frontend lives in the sibling frontend/ workspace, not here —
// see frontend/scripts/build.ts, which outputs to frontend/dist.
export const distDir = path.join(repoRoot, "frontend", "dist");

// Local, gitignored storage for the SQLite file and the generated JWT
// secret — created once on first server start.
mkdirSync(dataDir, { recursive: true });
