# Food Truth Scanner — personalized food intelligence from a barcode

Scan any grocery barcode to get an explainable food score and see how one serving fits your personal nutrition targets.

**Live demo:** https://vedantm1049.github.io/food-truth-scanner/

**Product decisions:** [why the score shows "unavailable" instead of guessing, and the FSA-based methodology](product-decisions.md)

<img width="400" height="564" alt="Food Truth Scanner barcode demo" src="https://github.com/user-attachments/assets/82a2ca52-f6d1-4480-81be-866cde04c689" />

## What it does

- Scan a barcode with the camera or enter it manually.
- Curated catalogue products use hand-researched nutrition, ingredient and allergen data.
- Unknown barcodes are looked up through Open Food Facts.
- The core 0–100 Food Truth Score is deterministic and **source-neutral**: the same nutrition inputs are used for curated and external products.
- Ingredient and processing context is shown separately from the numeric score so a product is not rewarded or penalized simply because one data source is richer than another.
- Open Food Facts results show a **data-confidence indicator** because community product records vary in completeness.
- If core scoring inputs are missing, the product is still shown but the score is explicitly marked unavailable rather than guessed.
- A separate **For You** layer shows how one serving contributes to the user's daily calorie, protein, sugar and sodium targets.
- Recommended daily targets are calculated from profile, goal and activity level; users can optionally set their own targets in Account.
- The app does **not** assume what the user has already eaten that day or invent a remaining calorie budget.
- If a product contains a flagged allergen, an alert is shown independently of its score.

## Two data paths, one scoring rule

### Curated catalogue

The bundled catalogue contains hand-researched products with nutrition, ingredient and allergen data checked against brand, retailer and/or barcode-specific sources. Curated products can therefore show richer ingredient notes, processing context, Market details and replacement recommendations where configured.

That richer metadata does **not** change the 0–100 score. The score uses the same source-neutral nutrition rules as an external barcode result.

### Open Food Facts lookup

If a scanned barcode is not in the curated catalogue, the browser queries Open Food Facts for product identity, nutrition, ingredients, allergens and imagery.

Open Food Facts provides the raw product data. **Food Truth Scanner applies the same nutrition scoring rules used for curated products and then adds personalized target context.** External products remain separate from the curated catalogue: they are not added to Market or Browse and do not receive product comparisons or replacement recommendations.

Because Open Food Facts is community-maintained, each external result includes a High / Medium / Low data-confidence indicator based on record completeness. A score is only calculated when sugar, saturated fat and sodium are present; missing core inputs produce an explicit **Score unavailable** state. Missing optional nutrients such as protein or fiber remain **Not available** in the UI rather than being displayed as 0g.

Ingredient and processing information from external records is displayed as source context, not converted into extra score penalties. This avoids a structural bias where curated products would be penalized for having more thoroughly researched ingredient data than external competitors.

## Personalization without pretending to track the day

The **For You** panel is deliberately separate from the Food Truth Score.

By default, the app calculates recommended daily targets from the user's profile using a BMR/TDEE-based model plus their selected goal and activity level. In Account, users can switch to **Set my own** and override calories, protein, sugar and sodium targets.

For each product, the app shows the contribution of one serving to those targets — for example, `18g protein · 14% of daily target` — rather than claiming to know how much the user has already consumed.

Allergen matching is also personalized from the user's profile and surfaced independently of the nutrition score.

## Scoring methodology

The numeric score uses the UK Food Standards Agency's published front-of-pack "high in" thresholds for sugar, saturated fat and sodium, normalized per 100g/100ml so a small serving size cannot game the result. Drinks use the FSA's separate, stricter drink thresholds.

Protein and fiber can contribute limited bonus points, but those bonuses are disabled once sugar, saturated fat or sodium reaches its "high" threshold, preventing one favorable macro from masking a material negative.

The important parity rule is simple:

**Identical nutrition data must produce the same numeric score regardless of whether the product came from the curated catalogue or Open Food Facts.**

Ingredient quality, processing markers, allergens and data confidence are still useful product information, but they are deliberately presented outside the number because their completeness is not comparable across data sources.

The implementation is in `scoring.js`, and `tests/scoring-parity.test.js` protects the source-neutral scoring rule from regressions.

## Barcode scanning

The camera scanner prioritizes common grocery formats including EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39 and ITF. It prefers the rear camera, normalizes UPC/EAN leading-zero variants, safely shuts the camera down before navigation, and falls back to manual entry with a visible error when camera access is unavailable.

The scanner library is loaded from a primary CDN with a second CDN fallback so a single third-party host failure does not disable camera scanning entirely.

Camera access still depends on browser support, HTTPS and the user's permission settings, so manual barcode entry remains a first-class fallback.

## Running it locally

No build step or package installation is required. From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` in a browser.

Open Food Facts lookup requires an internet connection for unknown barcodes. Camera permissions may be restricted by some browsers on plain HTTP; the deployed GitHub Pages demo runs over HTTPS.

Run the scoring regression check with:

```bash
node tests/scoring-parity.test.js
```

## Project structure

```text
index.html                    Entry point / script wiring
app.js                        Main UI, routing and curated-product interaction
scoring.js                    Source-neutral deterministic scoring engine
profile.js                    Recommended/custom daily target calculator
data.js                       Curated product dataset
catalog-overrides.js          Active catalogue removals
open-food-facts.js            Open Food Facts adapter + data normalization
off-runtime.js                External barcode lookup + OFF result screen
score-parity-runtime.js       Shared score-methodology UI copy
scanner-runtime.js            Hardened camera/barcode lifecycle
personalization.js            Shared For You + daily target settings layer
personalization-styles.css    Personalization controls styling
off-styles.css                External result styles
styles.css                    Main app styling
branding.js                   User-facing brand normalization
tests/                        Regression checks
```

## Data principles

- Curated products always win for known barcodes; they are not silently replaced by Open Food Facts data.
- External records are clearly labeled as Open Food Facts data.
- Identical nutrition produces an identical numeric score regardless of source.
- Ingredient / processing context is separate from the numeric score when source completeness is not comparable.
- Missing nutrition data is preserved as missing rather than fabricated.
- Open Food Facts products do not enter the Market catalogue.
- External allergen mapping does not treat generic gluten as equivalent to wheat.
- Product scoring is deterministic and inspectable rather than generated by an LLM.
- Personalized target context is based only on configured daily targets; the app does not simulate meals already consumed.

## License

MIT — see [LICENSE](LICENSE).
