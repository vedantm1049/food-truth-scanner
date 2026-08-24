/* Open Food Facts integration for unknown scanned barcodes.
 * Curated catalogue products remain unchanged. OFF products are adapted into
 * a separate external-result shape and never enter PRODUCTS / Market / Browse.
 *
 * OFF results currently support nutrition-based scoring only. The curated
 * processing/concern-marker review is deliberately not inferred from external
 * ingredient text, because doing so would create false precision.
 */

const OFF_API_BASE = "https://world.openfoodfacts.org/api/v2/product";

function offFirstString(value) {
  if (Array.isArray(value)) return value.find(Boolean) || "";
  return value || "";
}

function offNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function offPer100(nutriments, key) {
  return offNumber(nutriments?.[`${key}_100g`]);
}

function offServingMultiplier(servingSize, productQuantity) {
  const raw = String(servingSize || "").toLowerCase().replace(/,/g, ".");
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml)/);
  if (match) return Number(match[1]) / 100;
  const quantity = String(productQuantity || "").toLowerCase().replace(/,/g, ".");
  const qMatch = quantity.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml)/);
  if (qMatch) return Number(qMatch[1]) / 100;
  return 1;
}

function offCategory(product) {
  const tags = product.categories_tags || [];
  if (tags.some((x) => /beverage|drink|juice|soda|water|milk/.test(x))) return "beverages";
  if (tags.some((x) => /yogurt|yoghurt|dairy/.test(x))) return "other_dairy_products";
  if (tags.some((x) => /bread|bakery|pastr|croissant/.test(x))) return "longer_life_bakery";
  if (tags.some((x) => /cereal|breakfast/.test(x))) return "breakfast";
  return "snacks";
}

function offAllergens(product) {
  const text = (product.allergens_tags || []).join(" ").toLowerCase();
  const out = [];
  const map = [
    ["dairy", /milk|dairy/],
    ["soy", /soy|soya/],
    ["peanut", /peanut/],
    // Match tree nuts explicitly. Do not let "peanuts" also trigger tree_nuts.
    ["tree_nuts", /(?:^|[:\s-])nuts(?:$|[\s-])|almond|cashew|hazelnut|pistachio|walnut|pecan|macadamia|brazil[-\s]?nut/],
    ["eggs", /egg/],
    ["fish", /fish/],
    ["shellfish", /shellfish|crustacean|mollusc/],
    ["sesame", /sesame/],
    // Generic gluten is not equivalent to wheat (it may come from barley/rye).
    ["wheat", /wheat/],
  ];
  map.forEach(([key, rx]) => { if (rx.test(text)) out.push(key); });
  return [...new Set(out)];
}

function offIngredients(product) {
  if (Array.isArray(product.ingredients) && product.ingredients.length) {
    return product.ingredients
      .map((x) => x.text || x.id || "")
      .filter(Boolean)
      .slice(0, 60)
      .map((name) => ({ name, flag: null, reason: "" }));
  }
  const text = product.ingredients_text || "";
  if (!text) return [];
  return text
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 60)
    .map((name) => ({ name, flag: null, reason: "" }));
}

function offConfidence(product) {
  const n = product.nutriments || {};
  const core = ["sugars_100g", "saturated-fat_100g", "sodium_100g"];
  const corePresent = core.filter((k) => Number.isFinite(Number(n[k]))).length;
  let points = corePresent * 2;
  if (product.product_name) points += 1;
  if (product.brands) points += 1;
  if (product.ingredients_text || (product.ingredients || []).length) points += 1;
  if (product.image_front_url) points += 1;
  if (Number.isFinite(Number(product.completeness))) {
    points += Number(product.completeness) >= 0.8 ? 2 : Number(product.completeness) >= 0.5 ? 1 : 0;
  }
  if (points >= 10) return { level: "High", className: "high", note: "Core nutrition, identity and ingredient data are well populated in Open Food Facts." };
  if (points >= 7) return { level: "Medium", className: "medium", note: "Enough data to score, but some product fields are incomplete or community-sourced." };
  return { level: "Low", className: "low", note: "Open Food Facts has limited data for this product. Treat the result as directional." };
}

function adaptOpenFoodFactsProduct(code, product) {
  const nutriments = product.nutriments || {};
  const multiplier = offServingMultiplier(product.serving_size, product.quantity);
  const per100 = {
    calories: offPer100(nutriments, "energy-kcal"),
    sugar_g: offPer100(nutriments, "sugars"),
    satFat_g: offPer100(nutriments, "saturated-fat"),
    sodium_mg: (() => {
      const sodiumG = offPer100(nutriments, "sodium");
      return sodiumG == null ? null : sodiumG * 1000;
    })(),
    fiber_g: offPer100(nutriments, "fiber"),
    protein_g: offPer100(nutriments, "proteins"),
  };

  const canScore = per100.sugar_g != null && per100.satFat_g != null && per100.sodium_mg != null;
  const servingLabel = product.serving_size || product.quantity || "100g / 100ml reference";
  const nutrition = {
    calories: per100.calories == null ? null : +(per100.calories * multiplier).toFixed(1),
    sugar_g: per100.sugar_g == null ? null : +(per100.sugar_g * multiplier).toFixed(1),
    satFat_g: per100.satFat_g == null ? null : +(per100.satFat_g * multiplier).toFixed(1),
    sodium_mg: per100.sodium_mg == null ? null : Math.round(per100.sodium_mg * multiplier),
    // Preserve missingness for display. The scoring engine treats absent
    // positive nutrients as zero bonus without claiming the label says 0g.
    fiber_g: per100.fiber_g == null ? null : +(per100.fiber_g * multiplier).toFixed(1),
    protein_g: per100.protein_g == null ? null : +(per100.protein_g * multiplier).toFixed(1),
  };

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
    image: product.image_front_url || product.image_url || "",
    nutrition,
    allergens: offAllergens(product),
    mayContainAllergens: [],
    concernMarkers: [],
    positiveFlags: [],
    ingredients: offIngredients(product),
    verdict: canScore ? "" : "Score unavailable because Open Food Facts is missing sugar, saturated fat or sodium data for this barcode.",
    dataConfidence: offConfidence(product),
    offUrl: `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`,
    canScore,
    scoreScope: "nutrition-only",
    processingAssessed: false,
  };
}

async function fetchOpenFoodFactsProduct(code) {
  const fields = [
    "code","product_name","product_name_en","brands","quantity","serving_size",
    "image_front_url","image_url","nutriments","ingredients","ingredients_text",
    "allergens_tags","categories_tags","completeness"
  ].join(",");
  const url = `${OFF_API_BASE}/${encodeURIComponent(code)}.json?fields=${encodeURIComponent(fields)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const payload = await response.json();
  if (!payload || payload.status !== 1 || !payload.product) return null;
  return adaptOpenFoodFactsProduct(code, payload.product);
}
