# Food Truth Scanner — personalized food intelligence from a barcode

Scan a grocery barcode to get an explainable food score and see how one serving fits your personal nutrition targets.

**Live demo:** https://vedantm1049.github.io/food-truth-scanner/

## What it does

- Scan a retail food barcode with the camera or enter it manually.
- Curated catalogue products use hand-researched nutrition, ingredient and allergen data.
- Unknown barcodes are looked up through Open Food Facts.
- The 0–100 Food Truth Score is deterministic and **comprehensive across both data paths**: nutrition plus standardized processing / ingredient signals.
- Open Food Facts results use ingredient data, NOVA classification and additive metadata when available; if processing evidence is too incomplete to assess fairly, the score is marked unavailable rather than treating the product as clean.
- External results show a **data-confidence indicator** because community product records vary in completeness.
- A separate **For You** layer shows how one serving contributes to relevant daily targets such as calories, protein and sodium. Users can optionally set their own total-sugar target; recommended mode does not invent one from free/added-sugar guidance.
- Contains and trace/cross-contact allergens are surfaced independently of the score.

## Two data paths, one comprehensive scoring model

### Curated catalogue

The bundled catalogue contains hand-researched products with nutrition, ingredient and allergen data checked against brand, retailer and/or barcode-specific sources. Those ingredient records feed the shared processing classifier used by the numeric score.

### Open Food Facts lookup

If a scanned barcode is not in the curated catalogue, the browser queries Open Food Facts for product identity, nutrition, ingredients, allergens, trace allergens, NOVA group, additive tags and imagery.

Food Truth Scanner normalizes that evidence into the **same scoring dimensions** used for curated products. External products remain separate from Market and Browse and do not receive curated replacement recommendations.

A score is only calculated when sugar, saturated fat and sodium are present **and** there is enough ingredient / NOVA / additive evidence to assess processing. Missing evidence produces an explicit **Score unavailable** state rather than an assumed zero processing penalty. Network/API failures are also kept separate from true “product not found” results.

## Scoring methodology

The score starts at 100 and applies:

- Sugar: up to **−40**
- Saturated fat: up to **−15**
- Sodium: up to **−20**
- Processing / ingredient concerns: up to **−25**
- Protein: up to **+8**
- Fiber: up to **+6**

Nutrition is normalized per 100g/100ml. Published UK Food Standards Agency front-of-pack thresholds are used as nutrient-density anchors for sugar, saturated fat and sodium, with stricter drink thresholds.

**The point weights above are Food Truth Scanner prototype heuristics, not an FSA score or a medical recommendation.** They are deliberately deterministic and visible so the model can be inspected, challenged and revised. Protein and fiber bonuses are disabled once sugar, saturated fat or sodium reaches its high threshold.

The shared processing classifier groups evidence into standardized signals such as:

- ultra-processed / reconstituted formulation
- non-nutritive sweeteners and sugar alcohols
- preservatives
- emulsifiers, stabilizers and texture agents
- artificial colours / flavours
- unusually high additive load

Related additives are grouped so one type of processing signal cannot inflate the penalty simply by appearing multiple times. Allergens are safety information and do not affect processing points. High sugar, saturated fat and sodium are already captured by nutrition and are not double-counted as processing.

Curated products provide manually researched ingredient evidence. Open Food Facts products provide ingredient records plus NOVA and additive metadata where available. NOVA 4 is used as fallback processing evidence when richer ingredient/additive evidence is absent rather than as an extra OFF-only penalty. The evidence source can differ; the **scoring dimensions and classifier are the same**.

The implementation is in `scoring.js`. Regression tests cover both the scoring parity rules and the Open Food Facts adapter.

## Personalization

The **For You** panel is deliberately separate from the Food Truth Score. Recommended daily calorie and protein targets are estimated from profile, goal and activity level; sodium is shown against a configurable daily target. Users can override these targets.

Recommended mode does **not** assign a daily total-sugar limit. Product labels and Open Food Facts usually report total sugars, while widely used public-health sugar limits apply to free or added sugars. Treating those as interchangeable would create false precision, especially for foods containing naturally occurring sugars. A user who intentionally tracks total sugar can set a custom total-sugar target.

The app shows how one serving contributes to the configured targets without pretending it knows what the user has already eaten that day.

## Barcode scanning

The camera scanner is deliberately constrained to retail barcode formats: EAN-13, EAN-8, UPC-A, UPC-E and ITF. Manual lookup accepts 8-, 12-, 13- or 14-digit retail codes. The scanner prefers the rear camera, normalizes UPC/EAN leading-zero variants, safely shuts the camera down before navigation, and falls back to manual entry when camera access is unavailable.

The scanner library uses a primary CDN with a fallback CDN. Camera access still depends on browser support, HTTPS and user permissions, so a real-device camera test remains necessary for each target browser/device combination.

## Architecture

The browser app intentionally has no build framework, but its runtime composition is explicit rather than relying on post-load patch files. Domain/data modules load first, the base UI shell loads next, feature modules only define installers, and `bootstrap.js` is the single composition root.

This means feature order is visible in one place and modules no longer self-execute by repeatedly wrapping whatever happened to be loaded before them.

## Running it locally

No build step or package installation is required:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`.

Run the regression checks with:

```bash
node tests/scoring-parity.test.js
node tests/off-adapter.test.js
node tests/architecture.test.js
```

## Project structure

```text
index.html                    Declarative browser script wiring
bootstrap.js                  Single application composition root
app.js                        Base UI, routing and curated-product interaction
scoring.js                    Deterministic scoring + shared processing classifier
profile.js                    Recommended/custom daily target calculator
data.js                       Curated product research dataset
catalog-policy.js             Explicit active-catalogue exclusions
open-food-facts.js            Open Food Facts adapter + evidence normalization
methodology.js                Methodology presentation feature
open-food-facts-ui.js         External lookup state + safe result presentation
personalization-feature.js    Shared For You + daily target settings feature
nutrient-ui.js                Nutrient-density presentation feature
scanner.js                    Retail barcode/camera lifecycle feature
branding.js                   Product-brand presentation feature
styles.css                    Base application styles
off-styles.css                Open Food Facts presentation styles
personalization-styles.css    Personalization presentation styles
tests/                        Scoring, adapter and architecture regression checks
```

## Data and trust principles

- Curated products always win for known barcodes.
- External records are clearly labeled as Open Food Facts data.
- Both sources use the same nutrition and processing scoring dimensions.
- Missing OFF processing evidence is never interpreted as “no processing concerns.”
- Missing nutrition data is preserved as missing rather than fabricated as zero.
- External community-maintained text is escaped before rendering, and image URLs are restricted to HTTP(S).
- A network/API failure is not presented as “barcode not found.”
- Contains and trace allergens are separate safety information and never affect the numeric score.
- Product scoring is deterministic and inspectable rather than generated by an LLM.
- The score is a prototype decision-support model, not clinical or medical advice.

## License

MIT — see [LICENSE](LICENSE).
