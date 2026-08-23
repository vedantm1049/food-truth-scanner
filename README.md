# Scan — barcode health-score prototype

A Yuka/Truth-in-labeling–style barcode scanner prototype: scan any product,
get a 0–100 health score, a plain-language verdict, a full ingredient
breakdown, and a personalized allergen check — all built as a vanilla
JS/HTML/CSS single-page app with no build step and no backend.

This is a demo prototype, not a production app. It runs entirely
client-side against a static, hand-researched 31-SKU dataset.

**Live demo:** https://vedantm1049.github.io/food-truth-scanner/

## Running it locally

No build step, no dependencies to install. From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` in a browser.

(Any static file server works — Python's is just the shortest path.)

## What it does

- Scan a barcode (via camera or manual entry) or browse the catalogue,
  and get a 0–100 score with a plain-language verdict for why it landed
  there.
- Score updates live against your own profile — change your macros,
  goal, or allergies and every score and recommendation recalculates.
- If a scanned product hits one of your flagged allergies, a red banner
  overrides the screen regardless of score.
- Product listings can be sorted by score (high→low / low→high) per
  category or across the full catalogue.
- Every score links to a "How we calculate this" sheet — the full
  scoring logic is disclosed in-app, not a black box.

## The scoring methodology

Every score is built from the UK Food Standards Agency's own published
front-of-pack "high in" thresholds for sugar, saturated fat, and sodium —
not invented for this app — normalized per 100g/100ml so a small serving
size can't game the score. Drinks are judged against the FSA's own
separate, stricter drink thresholds rather than the solid-food table.
Protein and fiber bonuses don't apply once any of those three has hit
its "high" cutoff, so a real problem on one axis can't be erased by a
good number elsewhere. Processing-marker penalties come from reviewing
each product's actual ingredient list, not from counting additives.
Full breakdown is in the in-app methodology sheet (`renderMethodologySheet()`
in `app.js`) and in `scoring.js`.

## Project structure

```
index.html      Entry point / shell
app.js          UI rendering, routing, and interaction logic
scoring.js      The scoring engine (documented inline)
profile.js      Daily calorie/macro target calculator
data.js         31-SKU product dataset
styles.css      All styling
assets/         Product images
```

## Data

31 real products with researched (not invented) nutrition data. Fields
with lower-confidence sourcing are flagged as such in the dataset itself
rather than presented as verified. This is a hand-curated demo dataset,
not a live product feed.
