#!/usr/bin/env node
/**
 * A static server for the player, with HTTP Range support.
 *
 * `python3 -m http.server` answers a Range request with the whole file and no
 * `Accept-Ranges`, so Chrome cannot seek the audio: `<audio>` reports
 * `readyState 1` and `currentTime` stays at 0 no matter what you assign. The
 * symptom looks exactly like a broken player — the picture steps, the voice
 * does not — and it is the server, not the page.
 *
 *   node scripts/serve-player.mjs [port]
 */

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "out/player"));
const PORT = Number(process.argv[2] ?? 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const file = join(ROOT, normalize(rel));

  // Never serve outside the bundle.
  if (!file.startsWith(ROOT + sep) && file !== ROOT) {
    res.writeHead(403).end("forbidden");
    return;
  }

  let st;
  try {
    st = statSync(file);
    if (st.isDirectory()) throw new Error("dir");
  } catch {
    res.writeHead(404).end("not found");
    return;
  }

  const type = TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");

  if (range) {
    const start = range[1] === "" ? st.size - Number(range[2]) : Number(range[1]);
    const end = range[2] === "" || range[1] === "" ? st.size - 1 : Math.min(Number(range[2]), st.size - 1);
    if (Number.isNaN(start) || start > end || start >= st.size) {
      res.writeHead(416, { "Content-Range": `bytes */${st.size}` }).end();
      return;
    }
    res.writeHead(206, {
      "Content-Type": type,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${st.size}`,
      "Accept-Ranges": "bytes",
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, "Accept-Ranges": "bytes" });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`player -> http://localhost:${PORT}/   (serving ${ROOT})`);
  console.log("Range requests supported — seeking works.");
});