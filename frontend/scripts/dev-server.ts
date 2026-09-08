// Development server with live rebuild-on-request (esbuild serve + watch).
import * as esbuild from "esbuild";
import { promises as fs } from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const API_PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 4000;

const ctx = await esbuild.context({
  entryPoints: [path.join(root, "src", "main.tsx")],
  bundle: true,
  outfile: path.join(root, ".devbuild", "app.js"),
  format: "iife",
  jsx: "automatic",
  target: "es2020",
  sourcemap: true,
  loader: { ".tsx": "tsx", ".ts": "ts", ".css": "css" },
  logLevel: "info",
});

await ctx.watch();
console.log("Watching for changes...");

const { hosts, port } = await ctx.serve({
  servedir: path.join(root, ".devbuild"),
  port: 0,
});
const host = hosts[0] ?? "127.0.0.1";

const server = http.createServer(async (req, res) => {
  const url = req.url === "/" || !req.url ? "/index.html" : req.url;

  if (url === "/index.html") {
    const html = await fs.readFile(path.join(root, "index.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }
  if (url === "/assets/styles.css") {
    const css = await fs.readFile(path.join(root, "src", "styles.css"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/css" });
    res.end(css);
    return;
  }
  if (url.startsWith("/assets/")) {
    // proxy JS bundle + sourcemap from esbuild's internal server
    const forwardUrl = url.replace("/assets/", "/");
    const proxyReq = http.request({ hostname: host, port, path: forwardUrl, method: req.method }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    req.pipe(proxyReq, { end: true });
    return;
  }
  if (url.startsWith("/api/")) {
    // proxy auth/API requests to the Express server (see backend/index.ts) so
    // the frontend and API share one origin in dev too — no CORS, cookies work.
    const proxyReq = http.request(
      { hostname: "localhost", port: API_PORT, path: url, method: req.method, headers: req.headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );
    proxyReq.on("error", () => {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("API server is not running. Start it with `npm run server`.");
    });
    req.pipe(proxyReq, { end: true });
    return;
  }
  // static /public passthrough
  try {
    const filePath = path.join(root, "public", url);
    const data = await fs.readFile(filePath);
    res.writeHead(200);
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
