**Problem**

Existing global barcode/nutrition apps either give a single opaque score with no explanation, or drown the user in raw nutrition data they have to interpret themselves. Neither tells you clearly whether a product is a problem for you specifically, or whether the app is even confident in the data it's using. Nothing like this exists in the GCC market at all, and even established global players like Yuka and TruthIn don't have a personalization layer.

**Who it's for**

Someone standing in a supermarket aisle deciding between two products, who wants a fast, explainable answer, not a research project.

**Options considered**

Never seriously considered a simpler calorie-count or binary healthy/unhealthy flag — the goal from the start was a single, universal, fast-to-read score, with ingredient breakdowns and personalization available underneath for anyone who wants to go deeper, not pushed on everyone up front. Full daily food tracking (a MyFitnessPal-style "remaining budget") was considered and deliberately deferred, not ruled out — it's a heavier, later-stage feature, not part of the first build.

**Decision & trade-off**

The 0–100 score now uses the same nutrition inputs for every product, regardless of whether the record came from the curated catalogue or Open Food Facts. Sugar, saturated fat, sodium, protein and fiber are scored on the same deterministic basis. If core nutrition fields are missing, the score is unavailable rather than guessed.

Ingredient and processing context is intentionally kept outside the numeric score. Curated products often have manually researched ingredient detail while community-maintained external records can be incomplete. Penalizing processing only where richer data exists creates a source bias: two nutritionally identical products could receive different scores simply because one was researched more thoroughly. The parity rule is therefore explicit: **identical nutrition must produce an identical numeric score regardless of source.**

This does mean the score is narrower than a fully verified ingredient-quality model. The trade-off is deliberate. Ingredient quality, processing context, allergens and data confidence are still surfaced clearly alongside the score, but are not allowed to distort comparability until the same level of ingredient evidence can be established across products.

The nutrition thresholds themselves (sugar/saturated fat/sodium, and disabling protein/fiber bonus points once any of those crosses "high") follow the UK FSA's published methodology directly, not a custom threshold system. The goal is a defensible baseline rather than a proprietary black box.

**Outcome**

Originally built as a demo concept to show what a personalized food-scoring feature could look like inside an existing health/food company's product, in conversation with a potential opportunity. Generalized and rebranded as a standalone project — Food Truth Scanner — to publish on GitHub as an independent portfolio piece, built entirely from scratch with no external company's data or IP.

**What I would build next**

A stronger ingredient-processing layer based on a source-independent structured taxonomy, applied only when sufficient ingredient evidence exists for every product being compared. I would also add an explicit "Add to diet" action so a scan only counts toward a daily budget when the user confirms it is something they are actually eating, keeping scan-to-decide and log-to-track as two distinct actions.
