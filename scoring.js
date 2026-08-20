/**
 * Scan — scoring engine
 *
 * A 0-100 composite, built from a small set of negative and positive
 * nutrition factors — documented here in full (not a black box). See the
 * "How we calculate this" screen in the app, which renders this file's
 * logic in plain language.
 *
 * IMPORTANT — normalized to per-100g/100ml, not per serving.
 * An early draft of this scored per serving, and it broke immediately on a
 * real product: a 30g bag of Pringles came out "Excellent," because a small
 * enough serving makes almost anything look fine. Scoring per 100g/100ml
 * (the same normalization the UK Food Standards Agency and Nutri-Score use)
 * removes that gaming vector — shrinking the serving size can't move the
 * score. Per-serving nutrition is still what's shown on the result screen,
 * because that's what a person is actually about to eat; only the score
 * itself is computed on the normalized basis.
 *
 * Thresholds below are the UK FSA's official front-of-pack "high in"
 * thresholds (the same ones on UK/EU packaging today) — not invented, so
 * they're citable and defensible. The FSA publishes two separate tables,
 * not one: Table 2 (solid food, per 100g) and Table 3 (drinks, per 100ml)
 * — see "Guide to creating a front of pack (FoP) nutrition label", gov.uk.
 * The drink thresholds are roughly half the food ones across the board,
 * because a drink's sugar/fat/salt reads as "diluted" against a food-style
 * per-100g cutoff even though the whole thing gets consumed at once. An
 * earlier version of this file used only the food table for everything,
 * which is why some sugary drinks were scoring better than they should —
 * caught and fixed 2026-08-19, see CLAUDE.md.
 *
 *                        food (per 100g)    drink (per 100ml)
 *   sugar high:              >= 22.5g            >= 11.25g
 *   saturated fat high:      >= 5g                >= 2.5g
 *   salt (as sodium) high:   >= 600mg (1.5g salt)  >= 300mg (0.75g salt)
 *   fiber "high" claim: >= 6g / 100g  (EU nutrition-claim threshold, food only)
 *   protein "source" claim: >= 10g / 100g (pragmatic threshold, not a formal claim level)
 *
 * A product counts as a "drink" for this split when its category is
 * beverages, milk_milk_alternatives, or water_ice — i.e. it's poured and
 * drunk, not spooned or chewed. Yogurt sits in a dairy category but isn't
 * a drink, so it correctly stays on the food thresholds.
 *
 * Negative factors (max deduction sums to 100):
 *   - Sugar                 up to -40, maxed at the FSA "high" cutoff above
 *   - Saturated fat         up to -15, maxed at the FSA "high" cutoff above
 *   - Sodium                up to -20, maxed at the FSA "high" cutoff above
 *   - Processing/concern markers  up to -25, maxed at 4 flagged ingredients/techniques
 *
 * Positive factors (bonus, partially offsets the above — capped so it can
 * never fully cancel out heavy processing):
 *   - Protein               up to +8, maxed at 10g / 100g
 *   - Fiber                 up to +6, maxed at 6g / 100g
 *
 * IMPORTANT — bonus is voided if any negative axis is already maxed.
 * If sugar, saturated fat, or sodium has hit the FSA "high" cutoff above
 * (i.e. that axis is already taking its full deduction), protein and
 * fiber bonuses are zeroed out for that product, not just capped. Before
 * this rule, a product could hit "high" on sodium or saturated fat and
 * still land in the "Excellent" tier purely by having enough protein/fiber
 * to buy the points back — that's not a data problem, it's the formula
 * letting one good number erase a real, FSA-flagged risk. Caught and fixed
 * 2026-08-19 (Soul Pantry Tuscan Tomato Chips and ID Whole Wheat Parota
 * were the two products that surfaced it) — see CLAUDE.md for the full
 * before/after audit across all 31 SKUs.
 *
 * Final score is clamped to [0, 100].
 */

const CALO_SCORE_WEIGHTS = {
  sugar: { max: 40, at: 22.5, atDrink: 11.25 },
  satFat: { max: 15, at: 5, atDrink: 2.5 },
  sodium: { max: 20, at: 600, atDrink: 300 },
  concerns: { max: 25, at: 4 },
  protein: { max: 8, at: 10 },
  fiber: { max: 6, at: 6 },
};

const DRINK_CATEGORIES = new Set(["beverages", "milk_milk_alternatives", "water_ice"]);

function isDrinkProduct(product) {
  return DRINK_CATEGORIES.has(product.category);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Normalizes a product's per-serving nutrition to a per-100g/100ml basis.
 * product.servingSizeG must be the serving size in grams (or ml for liquids).
 */
function per100g(product) {
  const n = product.nutrition;
  const factor = 100 / product.servingSizeG;
  return {
    calories: n.calories * factor,
    sugar_g: n.sugar_g * factor,
    satFat_g: n.satFat_g * factor,
    sodium_mg: n.sodium_mg * factor,
    fiber_g: n.fiber_g * factor,
    protein_g: n.protein_g * factor,
  };
}

function computeCaloScore(product) {
  const n100 = per100g(product);
  const concernCount = (product.concernMarkers || []).length;
  const isDrink = isDrinkProduct(product);

  const sugarAt = isDrink ? CALO_SCORE_WEIGHTS.sugar.atDrink : CALO_SCORE_WEIGHTS.sugar.at;
  const satFatAt = isDrink ? CALO_SCORE_WEIGHTS.satFat.atDrink : CALO_SCORE_WEIGHTS.satFat.at;
  const sodiumAt = isDrink ? CALO_SCORE_WEIGHTS.sodium.atDrink : CALO_SCORE_WEIGHTS.sodium.at;

  const sugarRatio = clamp01(n100.sugar_g / sugarAt);
  const satFatRatio = clamp01(n100.satFat_g / satFatAt);
  const sodiumRatio = clamp01(n100.sodium_mg / sodiumAt);

  const sugarPts = sugarRatio * CALO_SCORE_WEIGHTS.sugar.max;
  const satFatPts = satFatRatio * CALO_SCORE_WEIGHTS.satFat.max;
  const sodiumPts = sodiumRatio * CALO_SCORE_WEIGHTS.sodium.max;
  const concernPts = clamp01(concernCount / CALO_SCORE_WEIGHTS.concerns.at) * CALO_SCORE_WEIGHTS.concerns.max;

  // A product that's hit the FSA's own "high" cutoff on sugar, saturated
  // fat, or sodium (ratio >= 1, i.e. that axis is already taking its full
  // deduction) can't use protein/fiber to buy back into a clean-sounding
  // tier — a real health risk isn't something a bonus should cancel out.
  // Added 2026-08-19 after Soul Pantry Tuscan Tomato Chips (sodium over
  // the "high" line) and ID Whole Wheat Parota (saturated fat over the
  // "high" line) both scored "Excellent" purely on protein/fiber offset —
  // see CLAUDE.md for the before/after audit across all 31 SKUs.
  const anyAxisMaxed = sugarRatio >= 1 || satFatRatio >= 1 || sodiumRatio >= 1;

  const proteinBonus = anyAxisMaxed ? 0 : clamp01(n100.protein_g / CALO_SCORE_WEIGHTS.protein.at) * CALO_SCORE_WEIGHTS.protein.max;
  const fiberBonus = anyAxisMaxed ? 0 : clamp01(n100.fiber_g / CALO_SCORE_WEIGHTS.fiber.at) * CALO_SCORE_WEIGHTS.fiber.max;

  const raw =
    100 - sugarPts - satFatPts - sodiumPts - concernPts + proteinBonus + fiberBonus;

  const score = Math.round(Math.max(0, Math.min(100, raw)));

  return {
    score,
    per100g: n100,
    isDrink,
    bonusZeroedByMaxedAxis: anyAxisMaxed,
    breakdown: {
      sugarPts: Math.round(sugarPts),
      satFatPts: Math.round(satFatPts),
      sodiumPts: Math.round(sodiumPts),
      concernPts: Math.round(concernPts),
      proteinBonus: Math.round(proteinBonus),
      fiberBonus: Math.round(fiberBonus),
    },
  };
}

function tierForScore(score) {
  if (score >= 80) return { key: "excellent", label: "Great choice", color: "#1E9D65", bg: "#E6F5EC" };
  if (score >= 60) return { key: "good", label: "Solid pick", color: "#5CB584", bg: "#EEF7F1" };
  if (score >= 40) return { key: "fair", label: "Okay in moderation", color: "#C68A2E", bg: "#FBF1E1" };
  return { key: "poor", label: "Rarely a good call", color: "#C1462E", bg: "#FBEAE6" };
}

function trafficLight(value, mediumAt, highAt, higherIsBetter) {
  // Returns 'good' | 'medium' | 'high' for coloring a nutrient row.
  if (higherIsBetter) {
    if (value >= highAt) return "good";
    if (value >= mediumAt) return "medium";
    return "high";
  }
  if (value <= mediumAt) return "good";
  if (value <= highAt) return "medium";
  return "high";
}

// Thresholds for the per-nutrient traffic lights shown on the result screen.
// These apply to the PER-SERVING values actually displayed to the user
// (not the per-100g values used for the score itself) — UK FSA per-portion
// "high in" guidance, adapted to the serving sizes in this dataset.
const NUTRIENT_THRESHOLDS = {
  sugar_g: { medium: 5, high: 15, higherIsBetter: false, unit: "g" },
  satFat_g: { medium: 1.5, high: 5, higherIsBetter: false, unit: "g" },
  sodium_mg: { medium: 120, high: 400, higherIsBetter: false, unit: "mg" },
  fiber_g: { medium: 2, high: 4, higherIsBetter: true, unit: "g" },
  protein_g: { medium: 3, high: 8, higherIsBetter: true, unit: "g" },
};

function nutrientLight(key, value) {
  const t = NUTRIENT_THRESHOLDS[key];
  if (!t) return "medium";
  return trafficLight(value, t.medium, t.high, t.higherIsBetter);
}
