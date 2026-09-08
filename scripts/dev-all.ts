// Runs the API server and the frontend dev server together (one `npm run
// dev`), so the app works end-to-end (signup/login included) without two
// terminals. `npm run dev:frontend` / `npm run server` still work standalone.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const nodeArgs = ["--no-warnings=ExperimentalWarning"];

const children = [
  spawn(process.execPath, [...nodeArgs, "backend/index.ts"], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, [...nodeArgs, "frontend/scripts/dev-server.ts"], { cwd: root, stdio: "inherit" }),
];

let shuttingDown = false;
function shutdown(code: number): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code) => shutdown(code ?? 0));
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
