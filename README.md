# Food Truth Scanner — personalized food intelligence from a barcode

Scan any grocery barcode to get an explainable food score and see how one serving fits your personal nutrition targets.

**Live demo:** https://vedantm1049.github.io/food-truth-scanner/

## What it does

- Scan a barcode with the camera or enter it manually.
- Curated catalogue products use hand-researched nutrition, ingredient and allergen data.
- Unknown barcodes are looked up through Open Food Facts.
- The 0–100 Food Truth Score is deterministic and **comprehensive across both data paths**: nutrition plus standardized processing / ingredient signals.
- Open Food Facts results use ingredient data, NOVA classification and additive metadata when available; if processing evidence is too incomplete to assess fairly, the score is marked unavailable rather than treating the product as clean.
- Open Food Facts results show a **data-confidence indicator** because community product records vary in completeness.
- A separate **For You** layer shows how one serving contributes to the user's daily calorie, protein, sugar and sodium targets.
- Allergens are surfaced independently of score.

## Two data paths, one comprehensive scoring model

### Curated catalogue

The bundled catalogue contains hand-researched products with nutrition, ingredient and allergen data checked against brand, retailer and/or barcode-specific sources. Those ingredient records feed the shared processing classifier used by the numeric score.

### Open Food Facts lookup

If a scanned barcode is not in the curated catalogue, the browser queries Open Food Facts for product identity, nutrition, ingredients, allergens, NOVA group, additive tags and imagery.

Food Truth Scanner normalizes that evidence into the **same scoring dimensions** used for curated products. External products remain separate from Market and Browse and do not receive curated replacement recommendations.

A score is only calculated when sugar, saturated fat and sodium are present **and** there is enough ingredient / NOVA / additive evidence to assess processing. Missing evidence produces an explicit **Score unavailable** state rather than an assumed zero processing penalty.

## Scoring methodology

The score starts at 100 and applies:

- Sugar: up to **−40**
- Saturated fat: up to **−15**
- Sodium: up to **−20**
- Processing / ingredient concerns: up to **−25**
- Protein: up to **+8**
- Fiber: up to **+6**

Nutrition uses UK Food Standards Agency front-of-pack "high in" thresholds and is normalized per 100g/100ml. Drinks use the FSA's stricter drink thresholds. Protein and fiber bonuses are disabled once sugar, saturated fat or sodium reaches its high threshold.

The shared processing classifier groups evidence into standardized signals such as:

- ultra-processed / reconstituted formulation
- non-nutritive sweeteners and sugar alcohols
- preservatives
- emulsifiers, stabilizers and texture agents
- artificial colours / flavours
- unusually high additive load

Related additives are grouped so one type of processing signal cannot inflate the penalty simply by appearing multiple times. Allergens are safety information and do not affect processing points. High sugar, saturated fat and sodium are already captured by nutrition and are not double-counted as processing.

Curated products provide manually researched ingredient evidence. Open Food Facts products provide ingredient records plus NOVA and additive metadata where available. The evidence source can differ; the **scoring dimensions and classifier are the same**.

The implementation is in `scoring.js`, and `tests/scoring-parity.test.js` protects these rules from regressions.

## Personalization

The **For You** panel is deliberately separate from the Food Truth Score. Recommended daily targets are calculated from profile, goal and activity level, with optional manual overrides. Each product shows how one serving contributes to those targets without pretending the app knows what the user has already eaten that day.

## Barcode scanning

The camera scanner prioritizes common grocery formats including EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39 and ITF. It prefers the rear camera, normalizes UPC/EAN leading-zero variants, safely shuts the camera down before navigation, and falls back to manual entry when camera access is unavailable.

The scanner library uses a primary CDN with a fallback CDN. Camera access still depends on browser support, HTTPS and user permissions.

## Running it locally

No build step or package installation is required:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`.

Run the scoring regression check with:

```bash
node tests/scoring-parity.test.js
```

## Project structure

```text
index.html                    Entry point / script wiring
app.js                        Main UI, routing and curated-product interaction
scoring.js                    Comprehensive deterministic scoring + shared processing classifier
profile.js                    Recommended/custom daily target calculator
data.js                       Curated product dataset
catalog-overrides.js          Active catalogue removals
open-food-facts.js            Open Food Facts adapter + processing evidence normalization
off-runtime.js                External barcode lookup + OFF result screen
score-parity-runtime.js       Shared methodology UI copy
scanner-runtime.js            Hardened camera/barcode lifecycle
personalization.js            Shared For You + daily target settings layer
tests/                        Regression checks
```

## Data principles

- Curated products always win for known barcodes.
- External records are clearly labeled as Open Food Facts data.
- Both sources use the same nutrition and processing scoring dimensions.
- Missing OFF processing evidence is never interpreted as "no processing concerns."
- Missing core nutrition data is preserved as missing rather than fabricated.
- Allergens are separate safety information and never affect the numeric score.
- Product scoring is deterministic and inspectable rather than generated by an LLM.

## License

MIT — see [LICENSE](LICENSE).
