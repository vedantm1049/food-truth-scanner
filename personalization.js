/* Food Truth Scanner — shared personalization layer.
 * Shows how one serving contributes to daily targets for both curated Market
 * products and Open Food Facts scans. It never simulates food already eaten.
 */

function targetPct(value, target) {
  if (value == null || target == null || target <= 0) return null;
  return Math.round((value / target) * 100);
}

function forYouSummary(product, targets, profile) {
  const pct = {
    calories: targetPct(product.nutrition.calories, targets.calories),
    sugar_g: targetPct(product.nutrition.sugar_g, targets.sugar_g),
    protein_g: targetPct(product.nutrition.protein_g, targets.protein_g),
    sodium_mg: targetPct(product.nutrition.sodium_mg, targets.sodium_mg),
  };

  const high = ["sugar_g", "sodium_mg"].filter((key) => pct[key] != null && pct[key] >= 35);

  if (
    profile.goal === "build_muscle" &&
    pct.protein_g != null && pct.protein_g >= 20 &&
    pct.calories != null && pct.calories <= 20
  ) {
    return `Strong protein contribution for your muscle-building goal: ${pct.protein_g}% of your daily protein target for ${pct.calories}% of daily calories.`;
  }
  if (profile.goal === "lose_weight" && pct.calories != null && pct.calories <= 12 && !high.length) {
    return `A relatively light serving at ${pct.calories}% of your daily calorie target.`;
  }
  if (high.length >= 2) return "This serving uses a meaningful share of both your daily sugar and sodium limits.";
  if (high.length === 1) {
    const label = high[0] === "sugar_g" ? "sugar" : "sodium";
    return `Relatively high in ${label}: ${pct[high[0]]}% of your daily target in one serving.`;
  }
  if (pct.protein_g != null && pct.protein_g >= 20) {
    return `Good protein contribution at ${pct.protein_g}% of your daily target.`;
  }
  return "A moderate contribution to your daily targets; the bars below show how much one serving accounts for.";
}

function dailyTargetBar(label, value, target, unit) {
  if (value == null || target == null || target <= 0) return "";
  const pct = Math.max(0, Math.round((value / target) * 100));
  const width = Math.min(100, pct);
  return `<div class="macro-bar-row">
    <div class="macro-bar-label"><span>${label}</span><span class="amt">${value}${unit} · ${pct}% of daily target</span></div>
    <div class="macro-bar-track"><div class="macro-bar-fill" style="width:${width}%;background:${macroBarColor(pct)};"></div></div>
  </div>`;
}

function renderForYouPanel(product) {
  const targets = computeDailyTargets(state.profile);
  const summary = forYouSummary(product, targets, state.profile);
  const mode = state.profile.targetMode === "custom" ? "Using your custom daily targets." : "Using recommended daily targets from your profile.";
  const sugarNote = state.profile.targetMode !== "custom"
    ? `<div class="panel-sub" style="margin-top:8px;">Total sugar is shown in the nutrition panel but not compared with a recommended daily limit, because product labels report total sugar while common public-health limits apply to free/added sugar.</div>`
    : "";
  return `<div class="panel for-you-panel">
    <div class="panel-title">For You</div>
    <div class="panel-sub">${summary}<br>${mode}</div>
    ${dailyTargetBar("Calories", product.nutrition.calories, targets.calories, " kcal")}
    ${dailyTargetBar("Sugar", product.nutrition.sugar_g, targets.sugar_g, "g")}
    ${dailyTargetBar("Protein", product.nutrition.protein_g, targets.protein_g, "g")}
    ${dailyTargetBar("Sodium", product.nutrition.sodium_mg, targets.sodium_mg, "mg")}
    ${sugarNote}
  </div>`;
}

// Curated products still originate from the legacy result template. Replace
// that one panel at the render boundary using semantic headings rather than a
// brittle exact-whitespace match.
const _ftsCuratedResult = renderResultOverlay;
renderResultOverlay = function(id) {
  const product = getProduct(id);
  let html = _ftsCuratedResult(id);
  const pattern = /<div class="panel">\s*<div class="panel-title">Fits Your Day<\/div>[\s\S]*?(?=<div class="panel">\s*<div class="panel-title">Nutrient Breakdown<\/div>)/;
  if (pattern.test(html)) html = html.replace(pattern, `${renderForYouPanel(product)}\n\n      `);
  return html;
};

if (typeof renderOffResultOverlay === "function") {
  const _ftsOffResult = renderOffResultOverlay;
  renderOffResultOverlay = function(product) {
    let html = _ftsOffResult(product);
    const marker = '<div class="panel off-confidence-panel">';
    if (html.includes(marker)) html = html.replace(marker, `${renderForYouPanel(product)}\n      ${marker}`);
    return html;
  };
}

function targetInput(label, key, value, unit, placeholder = "") {
  const safeValue = value == null ? "" : value;
  return `<label class="target-custom-field"><span>${label}</span><div><input type="number" value="${safeValue}" placeholder="${placeholder}" onchange="setCustomTarget('${key}', this.value)"><small>${unit}</small></div></label>`;
}

function renderTargetSettings() {
  const recommended = computeRecommendedDailyTargets(state.profile);
  const active = computeDailyTargets(state.profile);
  const custom = state.profile.targetMode === "custom";
  return `<div class="panel target-settings-panel">
    <div class="panel-title">Daily nutrition targets</div>
    <div class="panel-sub">Used only for the personalized “For You” context. The Food Truth Score itself does not change.</div>
    <div class="target-mode-row">
      <label><input type="radio" name="target-mode" ${!custom ? "checked" : ""} onchange="setTargetMode('recommended')"> Recommended</label>
      <label><input type="radio" name="target-mode" ${custom ? "checked" : ""} onchange="setTargetMode('custom')"> Set my own</label>
    </div>
    ${custom
      ? `<div class="target-custom-grid">${targetInput("Calories", "calories", active.calories, "kcal")}${targetInput("Protein", "protein_g", active.protein_g, "g")}${targetInput("Total sugar limit", "sugar_g", active.sugar_g, "g", "optional")}${targetInput("Sodium limit", "sodium_mg", active.sodium_mg, "mg")}</div><div class="panel-sub" style="margin-top:8px;">Only set a sugar limit here if you intentionally want to track <b>total</b> sugar from product labels.</div>`
      : `<div class="panel-sub" style="margin:10px 0 0;">Recommended: ${recommended.calories} kcal · ${recommended.protein_g}g protein · ${recommended.sodium_mg}mg sodium. No default total-sugar target is assumed.</div>`}
  </div>`;
}

function setTargetMode(mode) {
  state.profile.targetMode = mode === "custom" ? "custom" : "recommended";
  if (state.profile.targetMode === "custom" && !state.profile.customTargets) {
    const r = computeRecommendedDailyTargets(state.profile);
    state.profile.customTargets = {
      calories: r.calories,
      protein_g: r.protein_g,
      sugar_g: null,
      sodium_mg: r.sodium_mg,
    };
  }
  render();
}

function setCustomTarget(key, value) {
  if (!state.profile.customTargets) state.profile.customTargets = {};
  state.profile.customTargets[key] = value === "" ? null : Number(value);
  render();
}

const _ftsRender = render;
render = function() {
  _ftsRender();
  if (state.tab === "account" && !state.overlay) {
    const content = document.querySelector(".app-content");
    const grid = content && content.querySelector(".target-grid");
    if (content && !content.querySelector(".target-settings-panel")) {
      if (grid) grid.insertAdjacentHTML("afterend", renderTargetSettings());
      else content.insertAdjacentHTML("beforeend", renderTargetSettings());
    }
  }
};

render();
