# Cable Card

Cable Card is a local-first USB-C cable capability card and label generator. Add the few facts you know about a cable, then get a print-ready tag, a Markdown summary, a JSON export, and a small saved drawer list in the browser.

## Why it exists

The project was inspired by recent public discussion around cable confusion, especially WhatCable on Product Hunt: https://www.producthunt.com/products/whatcable

WhatCable reads cable capability data where the platform allows it. Cable Card is intentionally smaller and complementary: it does not inspect hardware. It helps you turn any observed, printed, tested, or manually entered facts into a clear label so the same cable does not become a mystery again.

## What it can do

- Generate a compact label with power, data, video, e-marker, length, and connector fields.
- Turn incomplete cable facts into a confidence score, best-use list, flags, and next checks.
- Copy a Markdown capability card for notes, docs, or a home inventory.
- Download a JSON export for one cable.
- Print a label-sized card.
- Save recent cards in local browser storage.
- Export the saved drawer as a CSV inventory.
- Run fully offline after the page is loaded.

## Why it is useful

USB-C cables often look identical while behaving very differently. A clear label reduces trial-and-error when charging a laptop, connecting a monitor, picking a travel cable, or choosing a cable for SSD backups.

## How to run

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 5196
```

Then open:

```text
http://localhost:5196
```

## Core flow

1. Fill the cable facts or use the included sample.
2. Review the generated capability card.
3. Copy the Markdown, save JSON, print a label, or add it to the local drawer.
4. Export the drawer CSV when you want a small inventory sheet.

## Validation

```bash
npm test
npm run check
python3 -m http.server 5196
curl -I http://localhost:5196/index.html
```

The app has no runtime dependencies. Tests use Node's built-in test runner.

## Future ideas

- Add CSV import for a whole cable drawer.
- Add a compact sheet layout for printing many labels at once.
- Add custom label sizes.
- Add a simple benchmark log for repeated transfer tests.
