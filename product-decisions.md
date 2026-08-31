**Problem**

Existing barcode and nutrition apps often either give an opaque score or overwhelm users with raw data. The harder product problem is to make the score explainable, personalized and comparable even when product evidence comes from different sources.

**Who it's for**

Someone standing in a supermarket aisle deciding between products, who wants a fast answer with enough detail underneath to understand why.

**Decision & trade-off**

The 0–100 Food Truth Score uses the same comprehensive scoring dimensions for curated catalogue products and Open Food Facts results: sugar, saturated fat, sodium, processing / ingredient concerns, protein and fiber.

The key parity decision is not to remove processing from curated products. Instead, both data paths feed a shared deterministic processing classifier. Curated products provide manually researched ingredient evidence; Open Food Facts products provide ingredients plus NOVA and additive metadata when available.

The processing classifier groups evidence into standardized categories such as ultra-processed / reconstituted formulation, non-nutritive sweeteners and sugar alcohols, preservatives, emulsifiers / stabilizers, artificial colours / flavours, and unusually high additive load. Related additives are grouped so repeated variants of the same processing signal do not unfairly stack points.

Allergens remain separate safety information. Nutrition warnings such as high saturated fat are already captured numerically and are not counted again as processing penalties.

The important missing-data rule is: **missing processing evidence is not evidence of a clean product.** An Open Food Facts result only receives a numeric score when core nutrition fields are available and there is enough ingredient, NOVA or additive evidence to assess processing. Otherwise the app shows Score unavailable and explains why.

This makes the two evidence sources different but the scoring model the same. Confidence remains explicit because Open Food Facts is community-maintained and evidence completeness varies by barcode.

The nutrition thresholds for sugar, saturated fat and sodium follow the UK FSA front-of-pack methodology, including stricter drink thresholds. Protein and fiber bonuses are disabled once any negative nutrition axis reaches its high threshold.

**Outcome**

Food Truth Scanner now treats scoring parity as an evidence-normalization problem rather than solving it by narrowing the score. The result is a more comprehensive score for external products without reducing the depth of the curated catalogue.

**What I would build next**

Expand the processing taxonomy against a much larger labelled product set, validate category weights against nutrition experts and real-world product comparisons, and add an explicit Add to diet action so scan-to-decide and log-to-track remain separate behaviors.
