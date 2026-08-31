**Problem**

Existing barcode and nutrition apps often either give an opaque score or overwhelm users with raw data. The harder product problem is to make the score explainable, personalized and comparable even when product evidence comes from different sources.

**Who it's for**

Someone standing in a supermarket aisle deciding between products, who wants a fast answer with enough detail underneath to understand why.

**Decision & trade-off**

The 0–100 Food Truth Score uses the same comprehensive scoring dimensions for curated catalogue products and Open Food Facts results: sugar, saturated fat, sodium, processing / ingredient concerns, protein and fiber.

The key parity decision is not to remove processing from curated products. Instead, both data paths feed a shared deterministic processing classifier. Curated products provide manually researched ingredient evidence; Open Food Facts products provide ingredients plus NOVA and additive metadata when available.

The processing classifier groups evidence into standardized categories such as ultra-processed / reconstituted formulation, non-nutritive sweeteners and sugar alcohols, preservatives, emulsifiers / stabilizers, artificial colours / flavours, and unusually high additive load. Related additives are grouped so repeated variants of the same processing signal do not unfairly stack points.

NOVA is useful external evidence but would create a source-specific advantage or penalty if layered indiscriminately on top of an otherwise equivalent ingredient assessment. NOVA 4 is therefore used as fallback evidence when richer ingredient/additive evidence is absent, rather than as an automatic extra OFF-only deduction.

Allergens remain separate safety information. Nutrition warnings such as high saturated fat are already captured numerically and are not counted again as processing penalties.

The important missing-data rule is: **missing processing evidence is not evidence of a clean product.** An Open Food Facts result only receives a numeric score when core nutrition fields are available and there is enough ingredient, NOVA or additive evidence to assess processing. Otherwise the app shows Score unavailable and explains why. API/network failures are also separated from genuine product-not-found outcomes.

The nutrient-density cutoffs for sugar, saturated fat and sodium use published UK FSA front-of-pack thresholds as anchors. **The Food Truth point weights themselves are prototype heuristics, not an FSA scoring model or a clinical recommendation.** Keeping the model deterministic and inspectable is intentional: the weights should be testable and revisable rather than presented as scientific certainty.

**Personalization trade-off**

The personalized “For You” layer is kept separate from the Food Truth Score. Recommended mode uses profile-based calorie and protein targets plus a configurable sodium target.

It deliberately does not generate a recommended daily **total-sugar** limit. Product labels and Open Food Facts commonly expose total sugars, while widely cited public-health limits generally concern free or added sugars. Comparing the two directly would create false precision for products such as plain yoghurt or fruit. Users who intentionally track total sugar can still set their own total-sugar target.

**Trust and data handling**

Open Food Facts is community-maintained, so external results show data confidence and are not treated as independently verified. Missing values remain missing rather than becoming zero. Nested ingredient records are traversed for processing evidence, trace allergens are kept separate from direct allergens, and untrusted external text is escaped before rendering. A package quantity is not silently treated as a serving size when OFF does not provide one.

**Outcome**

Food Truth Scanner treats scoring parity as an evidence-normalization problem rather than solving it by narrowing the score. The result is a more comprehensive score for external products without reducing the depth of the curated catalogue, while making uncertainty visible instead of hiding it.

**What I would build next**

Expand the processing taxonomy against a much larger labelled product set, validate the custom point weights against nutrition-expert review and real-world product comparisons, and add end-to-end browser tests around the scan → lookup → result flow. Camera behavior would still require real-device testing because browser permissions and camera hardware cannot be fully simulated in CI.
