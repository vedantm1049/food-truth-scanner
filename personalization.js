/* Shared personalized "For You" layer for curated and Open Food Facts results.
 * The core Food Truth Score remains product-based; this layer interprets how
 * a serving fits the user's profile, goal and remaining daily targets.
 */

function forYouMetricRatio(value, remaining) {
  if (value == null || remaining == null || remaining <= 0) return null;
  return value / remaining;
}

function forYouMetricLabel(key) {
  return {
    calories: "calories",
    sugar_g: "sugar",
    protein_g: "protein",
    sodium_mg: "sodium",
  }[key] || key;
}

function forYouSummary(product, remaining, profile) {
  const ratios = {
    calories: forYouMetricRatio(product.nutrition.calories, remaining.calories),
    sugar_g: forYouMetricRatio(product.nutrition.sugar_g, remaining.sugar_g),
    protein_g: forYouMetricRatio(product.nutrition.protein_g, remaining.protein_g),
    sodium_mg: forYouMetricRatio(product.nutrition.sodium_mg, remaining.sodium_mg),
  };

  const over = ["calories", "sugar_g", "sodium_mg"]
    .filter((key) => ratios[key] != null && ratios[key] > 1)
    .sort((a, b) => ratios[b] - ratios[a]);

  if (over.length >= 2) {
    return `A tougher fit today: this serving exceeds your remaining ${forYouMetricLabel(over[0])} and ${forYouMetricLabel(over[1])} targets.`;
  }

  if (over.length === 1) {
    return `High ${forYouMetricLabel(over[0])} relative to what you have left today.`;
  }

  const proteinRatio = ratios.protein_g;
  const calorieRatio = ratios.calories;

  if (profile.goal === "build_muscle" && proteinRatio != null && proteinRatio >= 0.25 && (calorieRatio == null || calorieRatio <= 0.5)) {
    return "Strong protein contribution for your muscle-building goal without using most of your remaining calories.";
  }

  if (profile.goal === "lose_weight" && calorieRatio != null && calorieRatio <= 0.3) {
    return "A relatively light calorie fit for what you have left today.";
  }

  const negativeRatios = [ratios.calories, ratios.sugar_g, ratios.sodium_mg].filter((x) => x != null);
  if (negativeRatios.length && negativeRatios.every((x) => x <= 0.35)) {
    return "Comfortably within your remaining calories, sugar and sodium for today.";
  }

  if (proteinRatio != null && proteinRatio >= 0.25 && (ratios.sugar_g == null || ratios.sugar_g <= 0.5) && (ratios.sodium_mg == null || ratios.sodium_mg <= 0.5)) {
    return "Good protein contribution while staying within your remaining sugar and sodium targets.";
  }

  return "Mostly fits within what you have left today; the bars below show where this serving uses more of your remaining allowance.";
}

function forYouBarsHTML(product, remaining) {
  const rows = [];
  if (product.nutrition.calories != null) rows.push(renderMacroBar("Calories", product.nutrition.calories, remaining.calories, ""));
  if (product.nutrition.sugar_g != null) rows.push(renderMacroBar("Sugar", product.nutrition.sugar_g, remaining.sugar_g, "g"));
  // Open Food Facts can omit protein; the adapter currently represents missing
  // protein as zero, so only show it when a positive value is actually present.
  if (!product.isOpenFoodFacts || product.nutrition.protein_g > 0) rows.push(renderMacroBar("Protein", product.nutrition.protein_g, remaining.protein_g, "g"));
  if (product.nutrition.sodium_mg != null) rows.push(renderMacroBar("Sodium", product.nutrition.sodium_mg, remaining.sodium_mg, "mg"));
  return rows.join("");
}

function renderForYouPanel(product) {
  const targets = computeDailyTargets(state.profile);
  const remaining = computeRemainingToday(targets, state.profile.consumedFraction);
  const summary = forYouSummary(product, remaining, state.profile);

  return `<div class="panel">
    <div class="panel-title">For You</div>
    <div class="panel-sub">${summary}</div>
    ${forYouBarsHTML(product, remaining)}
  </div>`;
}

// Curated / Market products already had a personalized macro panel. Keep the
// same bars, but make the heading neutral and the explanatory line genuinely
// personalized rather than always claiming the product "fits" the day.
const _foodTruthOriginalRenderResultOverlay = renderResultOverlay;
renderResultOverlay = function(id) {
  const product = getProduct(id);
  let html = _foodTruthOriginalRenderResultOverlay(id);
  const replacement = renderForYouPanel(product);
  html = html.replace(
    /<div class="panel">\s*<div class="panel-title">Fits Your Day<\/div>\s*<div class="panel-sub">Based on your computed daily targets and roughly where you are in the day — not a generic recommendation\.<\/div>[\s\S]*?<\/div>\s*<div class="panel">\s*<div class="panel-title">Nutrient Breakdown<\/div>/,
    `${replacement}\n\n      <div class="panel">\n        <div class="panel-title">Nutrient Breakdown</div>`
  );
  return html;
};

// External OFF products did not previously get the personalized layer. Insert
// the same "For You" panel before the OFF confidence/data panels.
if (typeof renderOffResultOverlay === "function") {
  const _foodTruthOriginalRenderOffResultOverlay = renderOffResultOverlay;
  renderOffResultOverlay = function(product) {
    let html = _foodTruthOriginalRenderOffResultOverlay(product);
    const marker = '<div class="panel off-confidence-panel">';
    if (html.includes(marker)) {
      html = html.replace(marker, `${renderForYouPanel(product)}\n      ${marker}`);
    }
    return html;
  };
}
