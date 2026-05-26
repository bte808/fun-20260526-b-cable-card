import { access, readFile } from "node:fs/promises";
import { generateCableCard } from "../src/cableCard.mjs";

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "src/cableCard.mjs",
  "README.md",
  "LICENSE"
];

for (const file of requiredFiles) {
  await access(new URL(`../${file}`, import.meta.url));
}

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

const card = generateCableCard({
  name: "Check cable",
  source: "tester",
  maxWatts: 100,
  dataGbps: 10,
  videoVerified: "unknown",
  eMarker: "yes"
});

const checks = [
  [html.includes('script type="module"'), "index loads module script"],
  [html.includes("Cable Card"), "index has app title"],
  [css.includes("@media (max-width: 640px)"), "mobile CSS exists"],
  [app.includes("navigator.clipboard"), "copy action exists"],
  [readme.includes("https://www.producthunt.com/products/whatcable"), "README cites inspiration"],
  [card.markdown.includes("Check cable"), "core generator returns markdown"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error(`FAIL: ${message}`);
  process.exit(1);
}

for (const [, message] of checks) console.log(`OK: ${message}`);
