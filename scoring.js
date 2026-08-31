/**
 * Food Truth Scanner — deterministic 0–100 scoring engine.
 *
 * The numeric score deliberately uses only nutrition fields that can be
 * evaluated consistently for both curated catalogue products and external
 * Open Food Facts results. Ingredient / processing context is still shown in
 * the product experience, but it does not change the numeric score. This keeps
 * a product from scoring better or worse merely because one data source was
 * researched more deeply than another.
 *
 * The score is normalized to 100g / 100ml so serving-size choices cannot game
 * the result. Sugar, saturated fat and sodium use the UK FSA front-of-pack
 * "high in" thresholds. Drinks use the FSA's stricter drink thresholds.
 * Protein and fiber can add a limited bonus, except when any negative nutrient
 * has already reached its high threshold.
 */

const CALO_SCORE_WEIGHTS = {
  sugar: { max: 40, at: 22.5, atDrink: 11.25 },
  satFat: { max: 15, at: 5, atDrink: 2.5 },
  sodium: { max: 20, at: 600, atDrink: 300 },
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

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Normalizes per-serving nutrition to a per-100g / per-100ml basis.
 * Missing optional positive nutrients are treated as zero bonus without
 * claiming that the product label itself says 0g.
 */
function per100g(product) {
  const n = product.nutrition || {};
  const servingSize = Math.max(1, safeNumber(product.servingSizeG, 100));
  const factor = 100 / servingSize;
  return {
    calories: safeNumber(n.calories) * factor,
    sugar_g: safeNumber(n.sugar_g) * factor,
    satFat_g: safeNumber(n.satFat_g) * factor,
    sodium_mg: safeNumber(n.sodium_mg) * factor,
    fiber_g: safeNumber(n.fiber_g) * factor,
    protein_g: safeNumber(n.protein_g) * factor,
  };
}

function computeCaloScore(product) {
  const n100 = per100g(product);
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

  const anyAxisMaxed = sugarRatio >= 1 || satFatRatio >= 1 || sodiumRatio >= 1;
  const proteinBonus = anyAxisMaxed
    ? 0
    : clamp01(n100.protein_g / CALO_SCORE_WEIGHTS.protein.at) * CALO_SCORE_WEIGHTS.protein.max;
  const fiberBonus = anyAxisMaxed
    ? 0
    : clamp01(n100.fiber_g / CALO_SCORE_WEIGHTS.fiber.at) * CALO_SCORE_WEIGHTS.fiber.max;

  const raw = 100 - sugarPts - satFatPts - sodiumPts + proteinBonus + fiberBonus;
  const score = Math.round(Math.max(0, Math.min(100, raw)));

  return {
    score,
    per100g: n100,
    isDrink,
    bonusZeroedByMaxedAxis: anyAxisMaxed,
    processingIncludedInScore: false,
    scoreScope: "source-neutral-nutrition",
    breakdown: {
      sugarPts: Math.round(sugarPts),
      satFatPts: Math.round(satFatPts),
      sodiumPts: Math.round(sodiumPts),
      // Kept for backwards compatibility with any older UI code. Processing
      // context is now deliberately outside the numeric score.
      concernPts: 0,
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
  if (higherIsBetter) {
    if (value >= highAt) return "good";
    if (value >= mediumAt) return "medium";
    return "high";
  }
  if (value <= mediumAt) return "good";
  if (value <= highAt) return "medium";
  return "high";
}

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
