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
  if (!product.isOpenFoodFacts || product.nutrition.protein_g > 0) rows.push(renderMacroBar("Protein", product.nutrition.protein_g, remaining.protein_g, "g"));
  if (product.nutrition.sodium_mg != null) rows.push(renderMacroBar("Sodium", product.nutrition.sodium_mg, remaining.sodium_mg, "mg"));
  return rows.join("");
}

function renderForYouPanel(product) {
  const targets = computeDailyTargets(state.profile);
  const remaining = computeRemainingToday(targets, state.profile.consumedFraction);
  const summary = forYouSummary(product, remaining, state.profile);

  return `<div class="panel for-you-panel">
    <div class="panel-title">For You</div>
    <div class="panel-sub">${summary}</div>
    ${forYouBarsHTML(product, remaining)}
  </div>`;
}

// Curated / Market results: keep the existing macro bars and simply make the
// heading neutral plus the supporting sentence genuinely personalized.
function applyCuratedForYouCopy() {
  if (!state.overlay || state.overlay.type !== "result") return;
  const product = getProduct(state.overlay.id);
  if (!product) return;
  const titles = [...document.querySelectorAll(".panel-title")];
  const title = titles.find((el) => el.textContent.trim() === "Fits Your Day");
  if (!title) return;
  const panel = title.closest(".panel");
  const sub = panel && panel.querySelector(".panel-sub");
  const targets = computeDailyTargets(state.profile);
  const remaining = computeRemainingToday(targets, state.profile.consumedFraction);
  title.textContent = "For You";
  if (sub) sub.textContent = forYouSummary(product, remaining, state.profile);
}

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

const _forYouObserver = new MutationObserver(() => applyCuratedForYouCopy());
const _forYouRoot = document.getElementById("app");
if (_forYouRoot) _forYouObserver.observe(_forYouRoot, { childList: true, subtree: true });
applyCuratedForYouCopy();
