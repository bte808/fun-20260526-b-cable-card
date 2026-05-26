import assert from "node:assert/strict";
import test from "node:test";
import { generateCableCard, getDataTier, getPowerTier, normalizeCable, parseNumber } from "../src/cableCard.mjs";

test("parseNumber accepts blank and numeric values", () => {
  assert.equal(parseNumber(""), null);
  assert.equal(parseNumber("10"), 10);
  assert.equal(parseNumber("-1"), null);
  assert.equal(parseNumber("oops"), null);
});

test("normalizeCable fills safe defaults", () => {
  const cable = normalizeCable({});
  assert.equal(cable.name, "Mystery cable");
  assert.equal(cable.connector, "USB-C to USB-C");
  assert.equal(cable.source, "manual");
});

test("power and data tiers create useful labels", () => {
  assert.equal(getPowerTier(100).short, "100W");
  assert.equal(getDataTier(10).short, "10G");
  assert.equal(getDataTier(null).label, "Data unknown");
});

test("high power without e-marker gets flagged", () => {
  const card = generateCableCard({
    name: "Travel cable",
    maxWatts: 100,
    dataGbps: 10,
    eMarker: "unknown",
    videoVerified: "unknown"
  });

  assert.match(card.markdown, /High-power claims/);
  assert.ok(card.flags.length >= 1);
  assert.ok(card.confidence < 100);
});

test("complete verified cable gets a strong card", () => {
  const card = generateCableCard({
    name: "Dock cable",
    location: "Desk",
    connector: "USB-C to USB-C",
    lengthM: 0.8,
    color: "Black",
    source: "tester",
    maxWatts: 240,
    dataGbps: 40,
    videoVerified: "yes",
    eMarker: "yes",
    notes: "Tested with dock and 4K display."
  });

  assert.equal(card.power.short, "240W");
  assert.equal(card.data.short, "40G");
  assert.equal(card.video.short, "VID OK");
  assert.ok(card.confidence >= 90);
  assert.ok(card.strengths.includes("Verified display path"));
});
