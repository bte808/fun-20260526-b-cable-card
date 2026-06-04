import { DEFAULT_CABLE, generateCableCard, toDrawerCsv, toLabelText } from "./src/cableCard.mjs";

const form = document.querySelector("#cable-form");
const output = document.querySelector("#output");
const markdownOutput = document.querySelector("#markdown-output");
const drawerList = document.querySelector("#drawer-list");
const drawerEmpty = document.querySelector("#drawer-empty");
const copyButton = document.querySelector("#copy-button");
const copyLabelButton = document.querySelector("#copy-label-button");
const saveButton = document.querySelector("#save-button");
const printButton = document.querySelector("#print-button");
const sampleButton = document.querySelector("#sample-button");
const resetButton = document.querySelector("#reset-button");
const addButton = document.querySelector("#add-button");
const exportDrawerButton = document.querySelector("#export-drawer-button");
const clearDrawerButton = document.querySelector("#clear-drawer-button");

const fields = {
  name: form.elements.name,
  location: form.elements.location,
  connector: form.elements.connector,
  lengthM: form.elements.lengthM,
  color: form.elements.color,
  source: form.elements.source,
  maxWatts: form.elements.maxWatts,
  dataGbps: form.elements.dataGbps,
  videoVerified: form.elements.videoVerified,
  eMarker: form.elements.eMarker,
  notes: form.elements.notes
};

const STORE_KEY = "cable-card-drawer-v1";
let currentCard = null;

function readForm() {
  return Object.fromEntries(Object.entries(fields).map(([key, element]) => [key, element.value]));
}

function writeForm(values) {
  for (const [key, value] of Object.entries(values)) {
    if (fields[key]) fields[key].value = value ?? "";
  }
  render();
}

function render() {
  currentCard = generateCableCard(readForm());
  output.innerHTML = renderCard(currentCard);
  markdownOutput.value = currentCard.markdown;
}

function renderCard(card) {
  const confidenceStyle = `--score:${card.confidence}%`;
  return `
    <section class="result-hero" aria-label="Generated cable card">
      <div>
        <p class="eyebrow">Cable card</p>
        <h2>${escapeHtml(card.cable.name)}</h2>
        <p>${escapeHtml(card.cable.location)} - ${escapeHtml(card.cable.connector)}</p>
      </div>
      <div class="score" style="${confidenceStyle}" aria-label="Confidence ${card.confidence} percent">
        <span>${card.confidence}%</span>
      </div>
    </section>

    <section class="label-preview" aria-label="Printable label preview">
      ${card.labelLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
    </section>

    <section class="capability-grid" aria-label="Capability summary">
      ${capability("Power", card.power.label, card.power.summary, card.power.rank)}
      ${capability("Data", card.data.label, card.data.summary, card.data.rank)}
      ${capability("Video", card.video.label, card.video.summary, card.video.rank)}
      ${capability("E-marker", formatMarker(card.cable.eMarker), "Recorded e-marker status for high-power decisions.", card.cable.eMarker === "yes" ? 2 : 0)}
    </section>

    <section class="list-band">
      <div>
        <h3>Best uses</h3>
        ${list(card.strengths)}
      </div>
      <div>
        <h3>Flags</h3>
        ${list(card.flags)}
      </div>
      <div>
        <h3>Next checks</h3>
        ${list(card.nextChecks)}
      </div>
    </section>
  `;
}

function capability(title, label, summary, rank) {
  return `
    <article class="metric metric-${Math.min(5, rank)}">
      <p>${title}</p>
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(summary)}</span>
    </article>
  `;
}

function list(items) {
  const safeItems = items.length ? items : ["None"];
  return `<ul>${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function loadDrawer() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveDrawer(items) {
  localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, 12)));
  renderDrawer();
}

function renderDrawer() {
  const items = loadDrawer();
  drawerList.innerHTML = items.map((item, index) => `
    <li>
      <button class="drawer-item" type="button" data-index="${index}">
        <strong>${escapeHtml(item.cable.name)}</strong>
        <span>${escapeHtml(item.labelLines.join(" / "))}</span>
      </button>
    </li>
  `).join("");
  drawerEmpty.hidden = items.length > 0;
  exportDrawerButton.disabled = items.length === 0;
  clearDrawerButton.disabled = items.length === 0;
}

function addCurrentToDrawer() {
  const items = loadDrawer();
  const next = [currentCard.json, ...items.filter((item) => item.cable.name !== currentCard.cable.name)];
  saveDrawer(next);
  flash(addButton, "Added");
}

async function copyMarkdown() {
  await copyText(currentCard.markdown, copyButton, "Copied");
}

async function copyLabel() {
  await copyText(toLabelText(currentCard), copyLabelButton, "Label copied");
}

async function copyText(text, button, copiedText) {
  try {
    await navigator.clipboard.writeText(text);
    flash(button, copiedText);
  } catch {
    markdownOutput.value = text;
    markdownOutput.focus();
    markdownOutput.select();
    flash(button, "Select");
  }
}

function downloadJson() {
  downloadText(`${slugify(currentCard.cable.name)}-cable-card.json`, JSON.stringify(currentCard.json, null, 2), "application/json");
}

function downloadDrawerCsv() {
  const items = loadDrawer();
  if (!items.length) return;
  downloadText("cable-drawer.csv", toDrawerCsv(items), "text/csv");
  flash(exportDrawerButton, "Exported");
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function flash(button, text) {
  const oldText = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = oldText;
  }, 1200);
}

function resetForm() {
  writeForm({
    name: "",
    location: "",
    connector: "USB-C to USB-C",
    lengthM: "",
    color: "",
    source: "manual",
    maxWatts: "",
    dataGbps: "",
    videoVerified: "unknown",
    eMarker: "unknown",
    notes: ""
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "mystery-cable";
}

function formatMarker(value) {
  if (!value || value === "unknown") return "Unknown";
  return value === "yes" ? "Yes" : "No";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

form.addEventListener("input", render);
form.addEventListener("change", render);
sampleButton.addEventListener("click", () => writeForm(DEFAULT_CABLE));
resetButton.addEventListener("click", resetForm);
copyButton.addEventListener("click", copyMarkdown);
copyLabelButton.addEventListener("click", copyLabel);
saveButton.addEventListener("click", downloadJson);
printButton.addEventListener("click", () => window.print());
addButton.addEventListener("click", addCurrentToDrawer);
exportDrawerButton.addEventListener("click", downloadDrawerCsv);
clearDrawerButton.addEventListener("click", () => saveDrawer([]));
drawerList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (!button) return;
  const item = loadDrawer()[Number(button.dataset.index)];
  if (item) writeForm(item.cable);
});

writeForm(DEFAULT_CABLE);
renderDrawer();
