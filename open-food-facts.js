/* Open Food Facts integration for unknown scanned barcodes. */

const OFF_API_BASE = "https://world.openfoodfacts.org/api/v2/product";

function offFirstString(value) {
  if (Array.isArray(value)) return value.find(Boolean) || "";
  return value || "";
}

function offNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function offPer100(nutriments, key) {
  return offNumber(nutriments?.[`${key}_100g`]);
}

function offServingMultiplier(servingSize) {
  const raw = String(servingSize || "").toLowerCase().replace(/,/g, ".");
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml)\b/);
  if (!match) return 1;
  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? amount / 100 : 1;
}

function offPer100WithServingFallback(nutriments, key, servingSize) {
  const direct = offPer100(nutriments, key);
  if (direct != null) return direct;

  const servingValue = offNumber(nutriments?.[`${key}_serving`]);
  if (servingValue == null) return null;

  const multiplier = offServingMultiplier(servingSize);
  if (!Number.isFinite(multiplier) || multiplier <= 0 || (multiplier === 1 && !String(servingSize || "").trim())) return null;
  return servingValue / multiplier;
}

function offHttpUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch (_) {
    return "";
  }
}

function offCategory(product) {
  const joined = (product.categories_tags || []).map((x) => String(x).toLowerCase()).join(" ");
  if (/yogurt|yoghurt|cheese|dairy-dessert|fermented-milk/.test(joined)) return "other_dairy_products";
  if (/bread|bakery|pastr|croissant/.test(joined)) return "longer_life_bakery";
  if (/cereal|breakfast/.test(joined)) return "breakfast";
  if (/\bwater\b|beverage|drink|juice|soda|soft-drink|energy-drink|sports-drink|tea-drink|coffee-drink/.test(joined)) return "beverages";
  if (/milk|plant-based-milk|milk-substitute/.test(joined)) return "milk_milk_alternatives";
  return "snacks";
}

function offMapAllergenTags(tags) {
  const text = (tags || []).join(" ").toLowerCase();
  const out = [];
  const map = [
    ["dairy", /milk|dairy/], ["soy", /soy|soya/], ["peanut", /peanut/],
    ["tree_nuts", /(?:^|[:\s-])nuts(?:$|[\s-])|almond|cashew|hazelnut|pistachio|walnut|pecan|macadamia|brazil[-\s]?nut/],
    ["eggs", /egg/], ["fish", /fish/], ["shellfish", /shellfish|crustacean|mollusc/],
    ["sesame", /sesame/], ["wheat", /wheat/], ["gluten", /gluten|wheat|barley|rye|spelt|kamut|triticale/],
  ];
  map.forEach(([key, rx]) => { if (rx.test(text)) out.push(key); });
  return [...new Set(out)];
}

function offAllergens(product) { return offMapAllergenTags(product.allergens_tags); }
function offMayContainAllergens(product) { return offMapAllergenTags(product.traces_tags); }

function offFlattenIngredients(rows, out = []) {
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    if (!row) continue;
    const name = row.text || row.id || "";
    if (name) out.push(String(name));
    if (Array.isArray(row.ingredients)) offFlattenIngredients(row.ingredients, out);
    if (out.length >= 100) break;
  }
  return out;
}

function offIngredients(product) {
  if (Array.isArray(product.ingredients) && product.ingredients.length) {
    const flat = offFlattenIngredients(product.ingredients).map((x) => x.trim()).filter(Boolean);
    const unique = [...new Set(flat)];
    if (unique.length) return unique.slice(0, 100).map((name) => ({ name, flag: null, reason: "" }));
  }
  const text = product.ingredients_text || "";
  if (!text) return [];
  return text.split(/[,;]+/).map((x) => x.trim()).filter(Boolean).slice(0, 100).map((name) => ({ name, flag: null, reason: "" }));
}

function offProcessingContext(product) {
  const novaRaw = offNumber(product.nova_group);
  const novaGroup = novaRaw != null && novaRaw >= 1 && novaRaw <= 4 ? Math.round(novaRaw) : null;
  const additiveTags = Array.isArray(product.additives_tags) ? product.additives_tags.filter(Boolean) : [];
  const additiveDataAvailable = Array.isArray(product.additives_tags);
  const notes = [];
  if (novaGroup === 4) notes.push("Open Food Facts classifies this product as NOVA 4 (ultra-processed).");
  else if (novaGroup) notes.push(`Open Food Facts lists this as NOVA ${novaGroup}.`);
  if (additiveTags.length) notes.push(`${additiveTags.length} additive tag${additiveTags.length === 1 ? " is" : "s are"} listed in the external record.`);
  return { novaGroup, additiveCount: additiveTags.length, additiveTags, additiveDataAvailable, note: notes.join(" "), available: Boolean(novaGroup != null || additiveDataAvailable) };
}

function offSodiumMgPer100(nutriments, servingSize) {
  const sodiumG = offPer100WithServingFallback(nutriments, "sodium", servingSize);
  if (sodiumG != null) return sodiumG * 1000;
  const saltG = offPer100WithServingFallback(nutriments, "salt", servingSize);
  return saltG == null ? null : (saltG / 2.5) * 1000;
}

function offConfidence(product, processingCoverage, nutritionCoverage) {
  const n = product.nutriments || {};
  const serving = product.serving_size;
  let core = 0;
  if (offPer100WithServingFallback(n, "sugars", serving) != null) core++;
  if (offPer100WithServingFallback(n, "saturated-fat", serving) != null) core++;
  if (offSodiumMgPer100(n, serving) != null) core++;
  let points = core * 2;
  if (product.product_name) points++;
  if (product.brands) points++;
  if (product.ingredients_text || (product.ingredients || []).length) points += 2;
  if (product.image_front_url) points++;
  const completeness = offNumber(product.completeness);
  if (completeness != null) points += completeness >= 0.8 ? 2 : completeness >= 0.5 ? 1 : 0;
  if (processingCoverage === "medium" || processingCoverage === "insufficient" || nutritionCoverage !== "full") points = Math.min(points, 8);
  if (points >= 10) return { level: "High", className: "high", note: "Core nutrition and processing evidence are well populated in Open Food Facts." };
  if (points >= 7) return { level: "Medium", className: "medium", note: "Enough evidence to score, but some product or processing fields are incomplete or community-sourced." };
  return { level: "Low", className: "low", note: "Open Food Facts has limited evidence for this product. The score is provisional and uses neutral assumptions for missing negative dimensions." };
}

function computeOpenFoodFactsScore(product) {
  if (!product?.canScore) return null;

  const servingFactor = Math.max(1, offNumber(product.servingSizeG) || 100) / 100;
  const scoringNutrition = { ...(product.nutrition || {}) };
  const isDrink = isDrinkProduct(product);
  const assumedAxes = [];

  if (scoringNutrition.sugar_g == null) {
    const per100 = (isDrink ? CALO_SCORE_WEIGHTS.sugar.atDrink : CALO_SCORE_WEIGHTS.sugar.at) * 0.5;
    scoringNutrition.sugar_g = per100 * servingFactor;
    assumedAxes.push("sugar");
  }
  if (scoringNutrition.satFat_g == null) {
    const per100 = (isDrink ? CALO_SCORE_WEIGHTS.satFat.atDrink : CALO_SCORE_WEIGHTS.satFat.at) * 0.5;
    scoringNutrition.satFat_g = per100 * servingFactor;
    assumedAxes.push("saturated fat");
  }
  if (scoringNutrition.sodium_mg == null) {
    const per100 = (isDrink ? CALO_SCORE_WEIGHTS.sodium.atDrink : CALO_SCORE_WEIGHTS.sodium.at) * 0.5;
    scoringNutrition.sodium_mg = per100 * servingFactor;
    assumedAxes.push("sodium");
  }

  const scoreProduct = { ...product, nutrition: scoringNutrition };
  const result = computeCaloScore(scoreProduct);
  let score = result.score;
  let assumedProcessingPenalty = 0;

  if (!result.processing.canAssess) {
    assumedProcessingPenalty = Math.round(CALO_SCORE_WEIGHTS.concerns.max * 0.5);
    score = Math.max(0, score - assumedProcessingPenalty);
  }

  return {
    ...result,
    score,
    provisional: assumedAxes.length > 0 || assumedProcessingPenalty > 0,
    assumedAxes,
    assumedProcessingPenalty,
    scoreScope: assumedAxes.length > 0 || assumedProcessingPenalty > 0 ? "provisional-partial" : result.scoreScope,
    breakdown: {
      ...result.breakdown,
      concernPts: result.breakdown.concernPts + assumedProcessingPenalty,
    },
  };
}

function adaptOpenFoodFactsProduct(code, product) {
  const nutriments = product.nutriments || {};
  const multiplier = offServingMultiplier(product.serving_size);
  const per100 = {
    calories: offPer100WithServingFallback(nutriments, "energy-kcal", product.serving_size),
    sugar_g: offPer100WithServingFallback(nutriments, "sugars", product.serving_size),
    satFat_g: offPer100WithServingFallback(nutriments, "saturated-fat", product.serving_size),
    sodium_mg: offSodiumMgPer100(nutriments, product.serving_size),
    fiber_g: offPer100WithServingFallback(nutriments, "fiber", product.serving_size),
    protein_g: offPer100WithServingFallback(nutriments, "proteins", product.serving_size),
  };

  const corePairs = [["sugar", per100.sugar_g], ["saturated fat", per100.satFat_g], ["sodium", per100.sodium_mg]];
  const knownCoreNutrients = corePairs.filter(([, value]) => value != null).map(([name]) => name);
  const missingCoreNutrients = corePairs.filter(([, value]) => value == null).map(([name]) => name);
  const coreKnown = knownCoreNutrients.length;
  const nutritionCoverage = coreKnown === 3 ? "full" : coreKnown === 2 ? "limited" : "insufficient";
  const servingLabel = product.serving_size || "100g / 100ml reference";
  const nutrition = {
    calories: per100.calories == null ? null : +(per100.calories * multiplier).toFixed(1),
    sugar_g: per100.sugar_g == null ? null : +(per100.sugar_g * multiplier).toFixed(1),
    satFat_g: per100.satFat_g == null ? null : +(per100.satFat_g * multiplier).toFixed(1),
    sodium_mg: per100.sodium_mg == null ? null : Math.round(per100.sodium_mg * multiplier),
    fiber_g: per100.fiber_g == null ? null : +(per100.fiber_g * multiplier).toFixed(1),
    protein_g: per100.protein_g == null ? null : +(per100.protein_g * multiplier).toFixed(1),
  };

  const ingredients = offIngredients(product);
  const processingContext = offProcessingContext(product);
  const provisional = { isOpenFoodFacts: true, ingredients, processingContext, concernMarkers: [] };
  const processing = assessProcessing(provisional);

  // Give a provisional score whenever OFF provides at least one core negative nutrient.
  // Missing negative dimensions are handled conservatively in computeOpenFoodFactsScore().
  const canScore = coreKnown >= 1;
  const scoreDataQuality = nutritionCoverage === "full"
    ? (processing.canAssess ? "full" : "nutrition-only")
    : `provisional-${nutritionCoverage}`;

  return {
    id: `off-${code}`,
    barcode: String(code),
    name: product.product_name || product.product_name_en || "Unknown product",
    brand: offFirstString(product.brands) || "Unknown brand",
    category: offCategory(product),
    servingLabel,
    servingSizeG: Math.max(1, multiplier * 100),
    isCaloMarket: false,
    isOpenFoodFacts: true,
    image: offHttpUrl(product.image_front_url || product.image_url),
    nutrition,
    allergens: offAllergens(product),
    mayContainAllergens: offMayContainAllergens(product),
    concernMarkers: [],
    positiveFlags: [],
    ingredients,
    processingContext,
    verdict: canScore ? "" : "Score unavailable because Open Food Facts does not provide any of sugar, saturated fat, sodium or salt for this product.",
    dataConfidence: offConfidence(product, processing.coverage, nutritionCoverage),
    offUrl: `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`,
    canScore,
    scoreScope: nutritionCoverage === "full" && processing.canAssess ? "comprehensive-parity" : "provisional-partial",
    scoreDataQuality,
    nutritionCoverage,
    knownCoreNutrients,
    missingCoreNutrients,
    processingAssessed: processing.canAssess,
  };
}

async function fetchOpenFoodFactsProduct(code) {
  const fields = [
    "code", "product_name", "product_name_en", "brands", "quantity", "serving_size",
    "image_front_url", "image_url", "nutriments", "ingredients", "ingredients_text",
    "allergens_tags", "traces_tags", "categories_tags", "completeness", "nova_group", "additives_tags",
  ].join(",");
  const response = await fetch(`${OFF_API_BASE}/${encodeURIComponent(code)}.json?fields=${encodeURIComponent(fields)}`, { headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open Food Facts request failed with ${response.status}`);
  const payload = await response.json();
  return payload && payload.status === 1 && payload.product ? adaptOpenFoodFactsProduct(code, payload.product) : null;
}
