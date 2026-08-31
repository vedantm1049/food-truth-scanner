/* Open Food Facts integration for unknown scanned barcodes.
 * External products stay separate from the curated catalogue but use the same
 * comprehensive Food Truth Score: nutrition + processing/ingredient evidence.
 */

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

function offHttpUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch (_) {
    return "";
  }
}

function offCategory(product) {
  const tags = (product.categories_tags || []).map((x) => String(x).toLowerCase());
  const joined = tags.join(" ");

  // Check foods that often contain the word "milk" before beverage matching so
  // yoghurt / dairy records do not accidentally receive stricter drink cutoffs.
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
    ["dairy", /milk|dairy/],
    ["soy", /soy|soya/],
    ["peanut", /peanut/],
    ["tree_nuts", /(?:^|[:\s-])nuts(?:$|[\s-])|almond|cashew|hazelnut|pistachio|walnut|pecan|macadamia|brazil[-\s]?nut/],
    ["eggs", /egg/],
    ["fish", /fish/],
    ["shellfish", /shellfish|crustacean|mollusc/],
    ["sesame", /sesame/],
    ["wheat", /wheat/],
    // Gluten is broader than wheat: barley/rye and their derivatives matter
    // for a gluten-sensitive profile even though they must not trigger a
    // wheat-allergy warning. Wheat itself does contain gluten, so it is also
    // a gluten signal in this direction only.
    ["gluten", /gluten|wheat|barley|rye|spelt|kamut|triticale/],
  ];
  map.forEach(([key, rx]) => { if (rx.test(text)) out.push(key); });
  return [...new Set(out)];
}

function offAllergens(product) {
  return offMapAllergenTags(product.allergens_tags);
}

function offMayContainAllergens(product) {
  return offMapAllergenTags(product.traces_tags);
}

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
    const flat = offFlattenIngredients(product.ingredients)
      .map((x) => x.trim())
      .filter(Boolean);
    const unique = [...new Set(flat)];
    if (unique.length) return unique.slice(0, 100).map((name) => ({ name, flag: null, reason: "" }));
  }

  const text = product.ingredients_text || "";
  if (!text) return [];
  return text
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((name) => ({ name, flag: null, reason: "" }));
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
  return {
    novaGroup,
    additiveCount: additiveTags.length,
    additiveTags,
    additiveDataAvailable,
    note: notes.join(" "),
    available: Boolean(novaGroup != null || additiveDataAvailable),
  };
}

function offConfidence(product, processingCoverage) {
  const n = product.nutriments || {};
  const core = ["sugars_100g", "saturated-fat_100g", "sodium_100g"];
  let points = core.filter((key) => offNumber(n[key]) != null).length * 2;
  if (product.product_name) points += 1;
  if (product.brands) points += 1;
  if (product.ingredients_text || (product.ingredients || []).length) points += 2;
  if (product.image_front_url) points += 1;
  const completeness = offNumber(product.completeness);
  if (completeness != null) points += completeness >= 0.8 ? 2 : completeness >= 0.5 ? 1 : 0;
  if (processingCoverage === "medium") points = Math.min(points, 8);
  if (points >= 10) return { level: "High", className: "high", note: "Core nutrition and processing evidence are well populated in Open Food Facts." };
  if (points >= 7) return { level: "Medium", className: "medium", note: "Enough evidence to score, but some product or processing fields are incomplete or community-sourced." };
  return { level: "Low", className: "low", note: "Open Food Facts has limited evidence for this product. Treat the result as directional and verify the label." };
}

function adaptOpenFoodFactsProduct(code, product) {
  const nutriments = product.nutriments || {};
  const multiplier = offServingMultiplier(product.serving_size);
  const per100 = {
    calories: offPer100(nutriments, "energy-kcal"),
    sugar_g: offPer100(nutriments, "sugars"),
    satFat_g: offPer100(nutriments, "saturated-fat"),
    sodium_mg: (() => {
      const grams = offPer100(nutriments, "sodium");
      return grams == null ? null : grams * 1000;
    })(),
    fiber_g: offPer100(nutriments, "fiber"),
    protein_g: offPer100(nutriments, "proteins"),
  };

  const nutritionComplete = per100.sugar_g != null && per100.satFat_g != null && per100.sodium_mg != null;
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
  const canScore = nutritionComplete && processing.canAssess;
  const missingReason = !nutritionComplete
    ? "Open Food Facts is missing sugar, saturated fat or sodium data."
    : !processing.canAssess
      ? "Open Food Facts does not have enough ingredient, additive or NOVA evidence to assess processing fairly."
      : "";

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
    verdict: canScore ? "" : `Score unavailable because ${missingReason}`,
    dataConfidence: offConfidence(product, processing.coverage),
    offUrl: `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`,
    canScore,
    scoreScope: "comprehensive-parity",
    processingAssessed: processing.canAssess,
  };
}

async function fetchOpenFoodFactsProduct(code) {
  const fields = [
    "code", "product_name", "product_name_en", "brands", "quantity", "serving_size",
    "image_front_url", "image_url", "nutriments", "ingredients", "ingredients_text",
    "allergens_tags", "traces_tags", "categories_tags", "completeness", "nova_group", "additives_tags",
  ].join(",");
  const response = await fetch(`${OFF_API_BASE}/${encodeURIComponent(code)}.json?fields=${encodeURIComponent(fields)}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open Food Facts request failed with ${response.status}`);
  const payload = await response.json();
  return payload && payload.status === 1 && payload.product ? adaptOpenFoodFactsProduct(code, payload.product) : null;
}
