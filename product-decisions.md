**Problem**

Existing global barcode/nutrition apps either give a single opaque score with no explanation, or drown the user in raw nutrition data they have to interpret themselves. Neither tells you clearly whether a product is a problem for you specifically, or whether the app is even confident in the data it's using. Nothing like this exists in the GCC market at all, and even established global players like Yuka and TruthIn don't have a personalization layer.

**Who it's for**

Someone standing in a supermarket aisle deciding between two products, who wants a fast, explainable answer, not a research project.

**Options considered**

Never seriously considered a simpler calorie-count or binary healthy/unhealthy flag — the goal from the start was a single, universal, fast-to-read score, with ingredient breakdowns and personalization available underneath for anyone who wants to go deeper, not pushed on everyone up front. Full daily food tracking (a MyFitnessPal-style "remaining budget") was considered and deliberately deferred, not ruled out — it's a heavier, later-stage feature, not part of the first build.

**Decision & trade-off**

Curated catalogue products get a full score plus manually reviewed processing/ingredient penalties; Open Food Facts (community) products get a narrower nutrition-based score with an explicit confidence indicator, and missing core data produces a "Score unavailable" state rather than a guess. This follows directly from one principle: if the underlying data quality is inconsistent, the score has to reflect that too — it doesn't make sense to show a confident score for a product whose ingredients or nutrition data haven't actually been verified.

The scoring thresholds themselves (sugar/saturated fat/sodium, and disabling protein/fiber bonus points once any of those crosses "high") follow the UK FSA's published methodology directly, not a custom formula — the goal was a defensible, external standard, not a proprietary scoring trick. Open to tuning later, but the baseline is deliberately not self-invented.

**Outcome**

Originally built as a demo concept to show what a personalized food-scoring feature could look like inside an existing health/food company's product, in conversation with a potential opportunity. Generalized and rebranded as a standalone project — Food Truth Scanner — to publish on GitHub as an independent portfolio piece, built entirely from scratch with no external company's data or IP.

**What I'd measure next**

An explicit "Add to diet" action (mirroring the existing Market cart button) so a scan only counts toward the daily budget when the user actually confirms it's something they're eating, not just comparing — keeping scan-to-decide and log-to-track as two distinct, intentional actions rather than collapsing them.
