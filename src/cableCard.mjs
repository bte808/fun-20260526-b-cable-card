const SOURCE_SCORE = {
  tester: 22,
  whatcable: 22,
  label: 14,
  listing: 12,
  manual: 5
};

const SPEED_LABELS = [
  { max: 0.48, label: "USB 2.0", short: "480M", use: "charging and simple accessories" },
  { max: 5, label: "USB 3 5 Gbps", short: "5G", use: "basic file transfer" },
  { max: 10, label: "USB 3 10 Gbps", short: "10G", use: "SSD backup" },
  { max: 20, label: "USB 3 20 Gbps", short: "20G", use: "fast SSD work" },
  { max: 40, label: "USB4 or Thunderbolt 40 Gbps", short: "40G", use: "docks and pro storage" },
  { max: Infinity, label: "USB4 v2 or Thunderbolt 5 class", short: "80G+", use: "top-end docks and displays" }
];

export const DEFAULT_CABLE = {
  name: "Desk silver 1m C-C",
  location: "Main desk drawer",
  connector: "USB-C to USB-C",
  lengthM: 1,
  color: "Silver braid",
  source: "label",
  maxWatts: 100,
  dataGbps: 10,
  videoVerified: "unknown",
  eMarker: "yes",
  notes: "Came with a portable SSD. Works for MacBook charging and fast backups."
};

export function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeCable(input = {}) {
  return {
    name: cleanText(input.name, "Mystery cable"),
    location: cleanText(input.location, "Cable drawer"),
    connector: cleanText(input.connector, "USB-C to USB-C"),
    lengthM: parseNumber(input.lengthM),
    color: cleanText(input.color, "Unlabeled"),
    source: input.source || "manual",
    maxWatts: parseNumber(input.maxWatts),
    dataGbps: parseNumber(input.dataGbps),
    videoVerified: input.videoVerified || "unknown",
    eMarker: input.eMarker || "unknown",
    notes: cleanText(input.notes, "")
  };
}

export function generateCableCard(input = {}) {
  const cable = normalizeCable(input);
  const power = getPowerTier(cable.maxWatts);
  const data = getDataTier(cable.dataGbps);
  const video = getVideoStatus(cable);
  const flags = getFlags(cable, power, data, video);
  const nextChecks = getNextChecks(cable, flags);
  const strengths = getStrengths(cable, power, data, video);
  const confidence = getConfidence(cable);
  const labelLines = makeLabelLines(cable, power, data, video);

  return {
    cable,
    power,
    data,
    video,
    flags,
    nextChecks,
    strengths,
    confidence,
    labelLines,
    markdown: makeMarkdown(cable, power, data, video, flags, nextChecks, strengths, confidence, labelLines),
    json: makeExportPayload(cable, power, data, video, flags, nextChecks, strengths, confidence, labelLines)
  };
}

export function toDrawerCsv(items = []) {
  const headers = [
    "name",
    "location",
    "connector",
    "lengthM",
    "color",
    "source",
    "maxWatts",
    "dataGbps",
    "videoVerified",
    "eMarker",
    "confidence",
    "strengths",
    "flags",
    "nextChecks"
  ];

  const rows = items.map((item) => {
    const cable = normalizeCable(item?.cable ?? {});
    return [
      cable.name,
      cable.location,
      cable.connector,
      cable.lengthM ?? "",
      cable.color,
      cable.source,
      cable.maxWatts ?? "",
      cable.dataGbps ?? "",
      cable.videoVerified,
      cable.eMarker,
      item?.confidence ?? "",
      joinList(item?.strengths),
      joinList(item?.flags),
      joinList(item?.nextChecks)
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function toLabelText(card) {
  const labelLines = Array.isArray(card?.labelLines) ? card.labelLines : [];
  const cable = normalizeCable(card?.cable ?? {});
  const confidence = Number.isFinite(card?.confidence) ? `${card.confidence}% confidence` : "confidence unknown";
  const bestUse = Array.isArray(card?.strengths) && card.strengths.length
    ? card.strengths.slice(0, 2).join(" / ")
    : "Use after checking capability";
  const firstCheck = Array.isArray(card?.nextChecks) && card.nextChecks.length
    ? card.nextChecks[0]
    : "Print the card and put the cable back in the drawer.";

  return [
    ...labelLines,
    `${cable.location} | ${confidence}`,
    `Best: ${bestUse}`,
    `Next: ${firstCheck}`,
    "Demo: https://bte808.github.io/fun-20260526-b-cable-card/"
  ].join("\n");
}

export function getPowerTier(watts) {
  if (watts === null) {
    return {
      label: "Power unknown",
      short: "PWR ?",
      rank: 0,
      summary: "Do not assume laptop-safe until tested."
    };
  }

  if (watts >= 240) return powerTier("240W EPR-ready", "240W", 5, "Best for high-power laptops and travel chargers.");
  if (watts >= 140) return powerTier("140W+ high-power", "140W+", 4, "Strong laptop cable if the charger and device also support it.");
  if (watts >= 100) return powerTier("100W laptop-class", "100W", 3, "Good default for laptops, docks, and tablets.");
  if (watts >= 60) return powerTier("60W everyday USB-C", "60W", 2, "Good for tablets, phones, and many light laptops.");
  if (watts >= 30) return powerTier("30W phone/tablet", "30W", 1, "Fine for phones, small tablets, and accessories.");
  return powerTier("Low-power accessory", `${watts}W`, 0, "Keep it away from laptop charging jobs.");
}

export function getDataTier(gbps) {
  if (gbps === null) {
    return {
      label: "Data unknown",
      short: "DATA ?",
      rank: 0,
      summary: "Treat it as charging-first until a transfer test is done."
    };
  }

  const tier = SPEED_LABELS.find((candidate) => gbps <= candidate.max) ?? SPEED_LABELS.at(-1);
  return {
    label: tier.label,
    short: tier.short,
    rank: Math.min(5, Math.max(1, SPEED_LABELS.indexOf(tier) + 1)),
    summary: `Best fit: ${tier.use}.`
  };
}

export function getVideoStatus(cable) {
  if (cable.videoVerified === "yes") {
    return {
      label: "Display tested",
      short: "VID OK",
      rank: 2,
      summary: "Safe to label as display-capable for the tested setup."
    };
  }

  if (cable.videoVerified === "no") {
    return {
      label: "No display",
      short: "VID NO",
      rank: 0,
      summary: "Do not use this cable for monitor or dock display paths."
    };
  }

  const likelyWorthTesting = cable.connector.toLowerCase().includes("usb-c to usb-c") && cable.dataGbps !== null && cable.dataGbps >= 10;
  return {
    label: "Display untested",
    short: "VID ?",
    rank: likelyWorthTesting ? 1 : 0,
    summary: likelyWorthTesting ? "Speed is promising, but display mode still needs a real test." : "Needs a direct monitor or dock test before labeling."
  };
}

export function makeLabelLines(cable, power, data, video) {
  return [
    cable.name.slice(0, 28),
    `${power.short} | ${data.short}`,
    `${video.short} | E-MARK ${formatUnknown(cable.eMarker)}`,
    `${formatLength(cable.lengthM)} | ${shortConnector(cable.connector)}`
  ];
}

function cleanText(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function powerTier(label, short, rank, summary) {
  return { label, short, rank, summary };
}

function joinList(items) {
  return Array.isArray(items) ? items.join(" | ") : "";
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function getFlags(cable, power, data, video) {
  const flags = [];
  const connector = cable.connector.toLowerCase();

  if (cable.maxWatts !== null && cable.maxWatts > 60 && cable.eMarker !== "yes") {
    flags.push("High-power claims should be verified with an e-marker or tester before laptop use.");
  }

  if (!connector.includes("usb-c to usb-c") && cable.maxWatts !== null && cable.maxWatts > 60) {
    flags.push("Non C-C cables are not a good place to rely on high USB-C PD wattage.");
  }

  if (cable.lengthM !== null && cable.lengthM > 2 && cable.dataGbps !== null && cable.dataGbps >= 20) {
    flags.push("Long high-speed cables can be sensitive; test with the actual dock or SSD.");
  }

  if (data.rank <= 1 && video.rank > 0) {
    flags.push("Display support and very low data speed look inconsistent; retest before labeling.");
  }

  if (cable.source === "manual") {
    flags.push("Manual entries are useful labels, but should be retested before critical jobs.");
  }

  if (power.rank === 0 || data.rank === 0 || video.short === "VID ?") {
    flags.push("At least one capability is unknown; keep a question mark on the physical label.");
  }

  return [...new Set(flags)];
}

function getNextChecks(cable, flags) {
  const checks = [];

  if (cable.maxWatts === null) checks.push("Measure charging wattage with a USB-C power meter or known laptop.");
  if (cable.dataGbps === null) checks.push("Run a small SSD copy test or read the printed/listed data rating.");
  if (cable.videoVerified === "unknown") checks.push("Try one known-good USB-C monitor or dock and record the result.");
  if (cable.eMarker === "unknown" && cable.maxWatts !== null && cable.maxWatts > 60) checks.push("Check e-marker status before trusting above 60W.");
  if (flags.length === 0) checks.push("Print the card and put the cable back in the drawer.");

  return checks.slice(0, 4);
}

function getStrengths(cable, power, data, video) {
  const strengths = [];

  if (power.rank >= 3) strengths.push("Laptop charging");
  else if (power.rank >= 1) strengths.push("Phone and tablet charging");

  if (data.rank >= 5) strengths.push("Docks and pro storage");
  else if (data.rank >= 3) strengths.push("SSD backups");
  else if (data.rank >= 1) strengths.push("Low-friction everyday use");

  if (video.rank === 2) strengths.push("Verified display path");
  if (cable.lengthM !== null && cable.lengthM <= 1) strengths.push("Short desk cable");
  if (cable.eMarker === "yes") strengths.push("E-marker recorded");

  return [...new Set(strengths)].slice(0, 6);
}

function getConfidence(cable) {
  let score = 20;
  score += SOURCE_SCORE[cable.source] ?? 5;
  if (cable.maxWatts !== null) score += 16;
  if (cable.dataGbps !== null) score += 16;
  if (cable.videoVerified !== "unknown") score += 14;
  if (cable.eMarker !== "unknown") score += 12;
  if (cable.lengthM !== null) score += 6;
  if (cable.notes.length > 8) score += 4;

  return Math.max(0, Math.min(100, score));
}

function makeMarkdown(cable, power, data, video, flags, nextChecks, strengths, confidence, labelLines) {
  const list = (items) => items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";

  return `# ${cable.name}

Location: ${cable.location}
Connector: ${cable.connector}
Length/color: ${formatLength(cable.lengthM)} / ${cable.color}
Confidence: ${confidence}%

## Label
${labelLines.join("\n")}

## Capabilities
- Power: ${power.label} - ${power.summary}
- Data: ${data.label} - ${data.summary}
- Video: ${video.label} - ${video.summary}
- E-marker: ${formatUnknown(cable.eMarker)}

## Best uses
${list(strengths)}

## Flags
${list(flags)}

## Next checks
${list(nextChecks)}

## Notes
${cable.notes || "None"}`;
}

function makeExportPayload(cable, power, data, video, flags, nextChecks, strengths, confidence, labelLines) {
  return {
    exportedAt: new Date().toISOString(),
    cable,
    confidence,
    labelLines,
    capabilities: {
      power: power.label,
      data: data.label,
      video: video.label,
      eMarker: cable.eMarker
    },
    strengths,
    flags,
    nextChecks
  };
}

function formatUnknown(value) {
  if (!value || value === "unknown") return "?";
  return String(value).toUpperCase();
}

function formatLength(lengthM) {
  if (lengthM === null) return "LEN ?";
  return `${Number(lengthM.toFixed(2))}m`;
}

function shortConnector(connector) {
  return connector
    .replaceAll("USB-C", "C")
    .replaceAll("USB-A", "A")
    .replaceAll("Lightning", "LTN")
    .replace(/\s+to\s+/gi, "-")
    .slice(0, 12);
}
