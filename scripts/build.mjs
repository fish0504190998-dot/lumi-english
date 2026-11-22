// Cloudflare Pages build: `npm run build` -> `dist/` holds ONLY the static site. No dependencies.
// Source of truth for what gets published (and for dist/_redirects and dist/_headers) is this file.
// Pages Functions (functions/), tests, sql files and videos are never copied. Videos are served from R2 (see VITE_VIDEO_BASE_URL).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const STATIC = [
  "manifest.webmanifest", "favicon.svg", "favicon-32.png", "apple-touch-icon.png",
  "icon-192.png", "icon-512.png", "og.png", "og-v2.png", "og-v3.jpg", "robots.txt", "sitemap.xml",
];
const DEFAULT_VIDEO_BASE = "https://lumienglish.co.il";

function fail(msg) { console.error("BUILD FAILED: " + msg); process.exit(1); }

// video base address (build-time env var, injected into index.html as window.__VIDEO_BASE_URL__)
let videoBase = String(process.env.VITE_VIDEO_BASE_URL || "").trim() || DEFAULT_VIDEO_BASE;
try { const u = new URL(videoBase); if (!/^https?:$/.test(u.protocol)) throw new Error("protocol"); videoBase = u.origin + u.pathname.replace(/\/+$/, ""); }
catch { fail("VITE_VIDEO_BASE_URL is not a valid http(s) address"); }

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// index.html + the video base injection (before </head>, so it runs before the app script)
let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
html = html.split("סיפורים מדורגים, צלילים ואותיות, שיחה בקול ותחרות עם חברים").join("שיעורי וידאו קצרים, סיפורים מדורגים, צלילים ואותיות ותחרות עם חברים");
const at = html.indexOf("</head>");
if (at < 0) fail("index.html has no </head>");
const seo = `<link rel="canonical" href="https://lumienglish.co.il/">\n<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"WebSite",name:"Lumi English",url:"https://lumienglish.co.il/",inLanguage:"he",description:"לומדים אנגלית בעברית: שיעורי וידאו קצרים, סיפורים, צלילים ואותיות."})}</script>\n`;
const inject = seo + `<script>window.__VIDEO_BASE_URL__=${JSON.stringify(videoBase).replace(/</g, "\\u003c")};</script>\n`;
html = html.slice(0, at) + inject + html.slice(at);
fs.writeFileSync(path.join(DIST, "index.html"), html);

for (const f of STATIC) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) fail("missing static file: " + f);
  fs.copyFileSync(src, path.join(DIST, f));
}

// assets/ (Uri and David figures, lesson posters): images only, copied as they are. Video/audio files are never copied (videos come from R2).
const ASSETS = path.join(ROOT, "assets");
if (fs.existsSync(ASSETS)) {
  fs.cpSync(ASSETS, path.join(DIST, "assets"), { recursive: true, filter: (src) => !/\.(mp4|webm|mov|m4v)$/i.test(src) });
}

// single-page-app fallback (Pages Functions under /api keep priority over this rule)
fs.writeFileSync(path.join(DIST, "_redirects"), "/* /index.html 200\n");
fs.writeFileSync(path.join(DIST, "_headers"), [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "",
  "/",
  "  Cache-Control: no-cache",
  "",
  "/index.html",
  "  Cache-Control: no-cache",
  "",
  "/manifest.webmanifest",
  "  Cache-Control: public, max-age=86400",
  "",
  "/*.png",
  "  Cache-Control: public, max-age=2592000",
  "",
  "/*.jpg",
  "  Cache-Control: public, max-age=2592000",
  "",
  "/*.svg",
  "  Cache-Control: public, max-age=2592000",
  "",
  "/og-v*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
].join("\n"));

// safety: no video files may end up in dist
const bad = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(mp4|webm|mov|m4v)$/i.test(e.name)) bad.push(path.relative(DIST, p)); } })(DIST);
if (bad.length) fail("video files found in dist: " + bad.join(", "));

const files = fs.readdirSync(DIST);
console.log(`dist ready (${files.length} files: ${files.join(", ")}); video base: ${videoBase}`);

