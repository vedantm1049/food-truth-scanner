/**
 * Food Truth Scanner — deterministic 0–100 scoring engine.
 *
 * Every product uses the same nutrition formula and the same processing
 * classifier. Curated products provide manually researched ingredient context;
 * Open Food Facts products provide ingredient text, NOVA and additive metadata.
 * Missing external processing evidence is never treated as a clean product —
 * the OFF adapter marks the score unavailable when the processing component
 * cannot be assessed at all.
 *
 * Score inputs:
 *   - Sugar                    up to -40
 *   - Saturated fat            up to -15
 *   - Sodium                   up to -20
 *   - Processing / ingredients up to -25
 *   - Protein                  up to +8
 *   - Fiber                    up to +6
 *
 * Nutrition is normalized to 100g / 100ml. Sugar, saturated fat and sodium
 * use UK FSA front-of-pack "high in" thresholds as anchors, with stricter
 * drink cutoffs. The point weights themselves are prototype heuristics.
 */

const CALO_SCORE_WEIGHTS = {
  sugar: { max: 40, at: 22.5, atDrink: 11.25 },
  satFat: { max: 15, at: 5, atDrink: 2.5 },
  sodium: { max: 20, at: 600, atDrink: 300 },
  concerns: { max: 25 },
  protein: { max: 8, at: 10 },
  fiber: { max: 6, at: 6 },
};

const DRINK_CATEGORIES = new Set(["beverages", "milk_milk_alternatives", "water_ice"]);

const PROCESSING_RULES = [
  {
    key: "ultra_processed",
    label: "Ultra-processed / reconstituted formulation",
    points: 7,
    pattern: /\bultra[- ]processed\b|reconstitut|dehydrated potato|industrial formulation|heavily processed/i,
  },
  {
    key: "sweeteners",
    label: "Non-nutritive sweeteners / sugar alcohols",
    points: 5,
    pattern: /sucralose|aspartame|acesulfame|saccharin|neotame|advantame|maltitol|xylitol|sorbitol|erythritol|mannitol|isomalt|lactitol|steviol glycoside|\bstevia\b|artificial sweetener|sugar alcohol/i,
  },
  {
    key: "preservatives",
    label: "Preservatives",
    points: 5,
    pattern: /preservative|potassium sorbate|sodium benzoate|calcium propionate|butylated hydroxyanisole|\bbha\b|\bbht\b|nitrite|nitrate|sulphite|sulfite|\be202\b|\be211\b|\be212\b|\be249\b|\be250\b|\be251\b|\be252\b|\be280\b|\be281\b|\be282\b|\be283\b|\be319\b|\be320\b|\be321\b/i,
  },
  {
    key: "texture_agents",
    label: "Emulsifiers / stabilizers / texture agents",
    points: 4,
    pattern: /emulsifier|stabilizer|stabiliser|thickener|humectant|polysorbate|carrageenan|glycerol|glycerin|propylene glycol|polydextrose|mono[- ]?and diglycerides|polyglycerol ester|\be322\b|\be407\b|\be412\b|\be415\b|\be466\b|\be471\b|\be472[a-f]?\b|\be475\b/i,
  },
  {
    key: "artificial_colours_flavours",
    label: "Artificial colours / flavours",
    points: 4,
    pattern: /artificial (?:flavou?r|colou?r)|synthetic (?:flavou?r|colou?r)|nature[- ]identical|tartrazine|sunset yellow|allura red|brilliant blue|ponceau|\be102\b|\be110\b|\be122\b|\be124\b|\be129\b|\be133\b/i,
  },
];

function isDrinkProduct(product) {
  return DRINK_CATEGORIES.has(product.category);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function safeNumber(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProcessingText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_:]/g, " ")
    .replace(/[^a-z0-9\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ingredientCorpus(product) {
  const ingredientRows = Array.isArray(product.ingredients) ? product.ingredients : [];
  const ingredientText = ingredientRows
    .map((x) => `${x?.name || ""} ${x?.reason || ""}`)
    .join(" ");
  const concernText = Array.isArray(product.concernMarkers) ? product.concernMarkers.join(" ") : "";
  const additiveText = Array.isArray(product.processingContext?.additiveTags)
    ? product.processingContext.additiveTags.join(" ")
    : "";
  const processingNote = product.processingContext?.note || "";
  return normalizeProcessingText(`${ingredientText} ${concernText} ${additiveText} ${processingNote}`);
}

function countRelevantFlaggedIngredients(product) {
  const rows = Array.isArray(product.ingredients) ? product.ingredients : [];
  const processingPattern = new RegExp(
    PROCESSING_RULES.map((rule) => `(?:${rule.pattern.source})`).join("|"),
    "i"
  );
  return rows.filter((row) => {
    if (!row || !["caution", "concern"].includes(row.flag)) return false;
    const text = normalizeProcessingText(`${row.name || ""} ${row.reason || ""}`);
    return processingPattern.test(text);
  }).length;
}

/**
 * Builds one standardized processing assessment regardless of data source.
 *
 * Curated products: full ingredient rows + manually researched concern notes.
 * OFF products: ingredient rows + NOVA + additive tags.
 *
 * Allergens, high sugar/saturated-fat/sodium notes and portion-size comments do
 * not trigger processing points unless they independently match a processing
 * rule, preventing double-counting nutrition or safety information.
 */
function assessProcessing(product) {
  const isExternal = Boolean(product.isOpenFoodFacts);
  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  const context = product.processingContext || {};
  const novaValue = context.novaGroup;
  const novaGroup = novaValue == null || novaValue === "" || !Number.isFinite(Number(novaValue))
    ? null
    : Number(novaValue);
  const additiveTags = Array.isArray(context.additiveTags) ? context.additiveTags : [];
  const corpus = ingredientCorpus(product);

  const hasIngredientEvidence = ingredients.length > 0;
  const hasNovaEvidence = novaGroup != null;
  const hasAdditiveEvidence = additiveTags.length > 0;
  const canAssess = !isExternal || hasIngredientEvidence || hasNovaEvidence || hasAdditiveEvidence;

  const signals = [];
  for (const rule of PROCESSING_RULES) {
    const matched = rule.pattern.test(corpus);
    if (matched) signals.push({ key: rule.key, label: rule.label, points: rule.points });
  }

  // NOVA is valuable external evidence, but should not create an extra penalty
  // on top of a rich ingredient record that an otherwise-equivalent curated
  // product would not receive. Use NOVA 4 as a fallback processing signal only
  // when OFF lacks ingredient/additive evidence capable of triggering the
  // shared classifier directly.
  const hasUltraSignal = signals.some((signal) => signal.key === "ultra_processed");
  if (!hasUltraSignal && novaGroup === 4 && !hasIngredientEvidence && !hasAdditiveEvidence) {
    signals.push({
      key: "ultra_processed",
      label: "Ultra-processed formulation (NOVA 4 fallback)",
      points: 7,
    });
  }

  const relevantFlaggedIngredients = countRelevantFlaggedIngredients(product);
  const additiveLoad = Math.max(additiveTags.length, relevantFlaggedIngredients);
  if (additiveLoad >= 4) {
    signals.push({
      key: "additive_load",
      label: "Multiple industrial additives / processing aids",
      points: 3,
    });
  }

  const rawPoints = signals.reduce((sum, signal) => sum + signal.points, 0);
  const points = Math.min(CALO_SCORE_WEIGHTS.concerns.max, rawPoints);

  let coverage = "high";
  if (isExternal) {
    if (hasIngredientEvidence && (hasNovaEvidence || context.additiveDataAvailable)) coverage = "high";
    else if (canAssess) coverage = "medium";
    else coverage = "insufficient";
  }

  return {
    points,
    signals,
    canAssess,
    coverage,
    evidence: {
      hasIngredients: hasIngredientEvidence,
      hasNova: hasNovaEvidence,
      hasAdditives: hasAdditiveEvidence,
      novaGroup,
      additiveCount: additiveTags.length,
    },
  };
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
  const processing = assessProcessing(product);
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
  const concernPts = processing.points;

  const anyAxisMaxed = sugarRatio >= 1 || satFatRatio >= 1 || sodiumRatio >= 1;
  const proteinBonus = anyAxisMaxed
    ? 0
    : clamp01(n100.protein_g / CALO_SCORE_WEIGHTS.protein.at) * CALO_SCORE_WEIGHTS.protein.max;
  const fiberBonus = anyAxisMaxed
    ? 0
    : clamp01(n100.fiber_g / CALO_SCORE_WEIGHTS.fiber.at) * CALO_SCORE_WEIGHTS.fiber.max;

  const raw = 100 - sugarPts - satFatPts - sodiumPts - concernPts + proteinBonus + fiberBonus;
  const score = Math.round(Math.max(0, Math.min(100, raw)));

  return {
    score,
    per100g: n100,
    isDrink,
    bonusZeroedByMaxedAxis: anyAxisMaxed,
    processingIncludedInScore: true,
    scoreScope: "comprehensive-parity",
    processing,
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
