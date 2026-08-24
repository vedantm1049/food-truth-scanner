# Food Truth Scanner — personalized food intelligence from a barcode

Scan any grocery barcode to get an explainable food score and see how one serving fits your personal nutrition targets.

**Live demo:** https://vedantm1049.github.io/food-truth-scanner/

<img width="400" height="529" alt="Food Truth Scanner barcode demo" src="https://github.com/user-attachments/assets/79ecf1d4-8d2c-4ecc-8157-bfff150984f7" />

## What it does

- Scan a barcode with the camera or enter it manually.
- Curated catalogue products use the existing hand-researched product data and product experience.
- Unknown barcodes are looked up through Open Food Facts and, when enough core nutrition data exists, scored with Food Truth Scanner's own deterministic scoring engine.
- Open Food Facts results show a **data-confidence indicator** because community product records vary in completeness.
- If core scoring inputs are missing, the app shows the product information but explicitly marks the score as unavailable rather than guessing.
- The core 0–100 score stays product-based and explainable.
- A separate **For You** layer shows how one serving contributes to the user's daily calorie, protein, sugar and sodium targets.
- Recommended daily targets are calculated from the user's profile, goal and activity level; users can optionally set their own targets in Account.
- The app does **not** assume what the user has already eaten that day or invent a remaining calorie budget.
- If a product contains a flagged allergen, an alert is shown regardless of its score.
- Every score links to a plain-language explanation of the scoring methodology.

## Two data paths

### Curated catalogue

The bundled catalogue contains hand-researched products with nutrition, ingredient and allergen data checked against brand, retailer and/or barcode-specific sources. These products retain the existing Market and product-detail experience.

### Open Food Facts lookup

If a scanned barcode is not in the curated catalogue, the browser queries Open Food Facts for product identity, nutrition, ingredients, allergens and imagery.

Open Food Facts provides the raw product data. **Food Truth Scanner provides the scoring and personalized target context.** External products are kept separate from the curated catalogue: they are not added to Market or Browse, and the app does not generate product comparisons or replacement recommendations for them.

Because Open Food Facts is community-maintained, each external result includes a High / Medium / Low data-confidence indicator based on the completeness of the product record. A score is only calculated when sugar, saturated fat and sodium are present; missing core inputs produce an explicit "Score unavailable" state.

## Personalization without pretending to track the day

The **For You** panel is deliberately separate from the Food Truth Score.

By default, the app calculates recommended daily targets from the user's profile using a BMR/TDEE-based model plus their selected goal and activity level. In Account, users can switch to **Set my own** and override calories, protein, sugar and sodium targets.

For each product, the app then shows the contribution of one serving to those targets — for example, "18g protein · 14% of daily target" — rather than claiming to know how much the user has already consumed.

Allergen matching is also personalized from the user's profile and is surfaced independently of the nutrition score.

## The scoring methodology

Every score is built from the UK Food Standards Agency's published front-of-pack "high in" thresholds for sugar, saturated fat and sodium, normalized per 100g/100ml so a small serving size cannot game the score. Drinks use the FSA's separate, stricter drink thresholds.

Protein and fiber can contribute bonus points, but those bonuses are disabled once sugar, saturated fat or sodium reaches its "high" threshold, preventing one favorable macro from masking a material negative.

For the curated catalogue, processing-marker penalties are based on review of the product's ingredient list. For Open Food Facts products, the score is intentionally conservative about what the external dataset can support and never fabricates missing nutrition data.

The full implementation is in `scoring.js`, with the methodology also disclosed inside the app.

## Running it locally

No build step and no package installation required. From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` in a browser.

The Open Food Facts lookup requires an internet connection when testing unknown barcodes.

## Project structure

```text
index.html                    Entry point / shell
app.js                        Existing UI, routing and curated-product interaction
scoring.js                    Transparent deterministic scoring engine
profile.js                    Recommended/custom daily target calculator
data.js                       Curated product dataset
catalog-overrides.js          Active catalogue removals
open-food-facts.js            Open Food Facts adapter
off-runtime.js                External barcode lookup + OFF-only result screen
personalization.js            Shared For You + daily target settings layer
personalization-styles.css    Personalization controls styling
off-styles.css                Styles for external product states
styles.css                    Main app styling
assets/                       Curated product images
```

## Data principles

- Curated products are not silently replaced by Open Food Facts data; the curated record always wins for known barcodes.
- External product records are clearly labeled as Open Food Facts data.
- Missing core nutrition data is never inferred or replaced with zero.
- Open Food Facts products do not enter the Market catalogue.
- Product scoring is deterministic and inspectable rather than generated by an LLM.
- Personalized target context is based only on the user's configured daily targets; the app does not simulate meals already consumed.
