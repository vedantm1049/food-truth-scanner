/* Shared personalized "For You" layer for curated and Open Food Facts results.
 * The core Food Truth Score remains product-based. This layer shows how one
 * serving contributes to the user's daily targets; it never assumes what the
 * user has already eaten today.
 */

function targetPct(value, target) {
  if (value == null || target == null || target <= 0) return null;
  return Math.round((value / target) * 100);
}

function targetMetricLabel(key) {
  return {
    calories: "calories",
    sugar_g: "sugar",
    protein_g: "protein",
    sodium_mg: "sodium",
  }[key] || key;
}

function forYouSummary(product, targets, profile) {
  const pct = {
    calories: targetPct(product.nutrition.calories, targets.calories),
    sugar_g: targetPct(product.nutrition.sugar_g, targets.sugar_g),
    protein_g: targetPct(product.nutrition.protein_g, targets.protein_g),
    sodium_mg: targetPct(product.nutrition.sodium_mg, targets.sodium_mg),
  };

  const high = ["sugar_g", "sodium_mg"]
    .filter((key) => pct[key] != null && pct[key] >= 35)
    .sort((a, b) => pct[b] - pct[a]);

  if (profile.goal === "build_muscle" && pct.protein_g != null && pct.protein_g >= 20 && (pct.calories == null || pct.calories <= 20)) {
    return `Strong protein contribution for your muscle-building goal: ${pct.protein_g}% of your daily protein target for ${pct.calories || 0}% of daily calories.`;
  }

  if (profile.goal === "lose_weight" && pct.calories != null && pct.calories <= 12 && (!high.length)) {
    return `A relatively light serving at ${pct.calories}% of your daily calorie target.`;
  }

  if (high.length >= 2) {
    return `This serving uses a meaningful share of your daily ${targetMetricLabel(high[0])} and ${targetMetricLabel(high[1])} limits.`;
  }

  if (high.length === 1) {
    return `Relatively high in ${targetMetricLabel(high[0])}: ${pct[high[0]]}% of your daily target in one serving.`;
  }

  if (pct.protein_g != null && pct.protein_g >= 20) {
    return `Good protein contribution at ${pct.protein_g}% of your daily target, while staying moderate on sugar and sodium.`;
  }

  return "A moderate contribution to your daily targets; the bars below show how much one serving accounts for.";
}

function dailyTargetBar(label, value, target, unit) {
  if (value == null || target == null || target <= 0) return "";
  const pct = Math.max(0, Math.round((value / target) * 100));
  const width = Math.min(100, pct);
  const color = macroBarColor(pct);
  return `<div class="macro-bar-row">
    <div class="macro-bar-label">
      <span>${label}</span>
      <span class="amt">${value}${unit} · ${pct}% of daily target</span>
    </div>
    <div class="macro-bar-track"><div class="macro-bar-fill" style="width:${width}%;background:${color};"></div></div>
  </div>`;
}

function forYouBarsHTML(product, targets) {
  const rows = [];
  if (product.nutrition.calories != null) rows.push(dailyTargetBar("Calories", product.nutrition.calories, targets.calories, " kcal"));
  if (product.nutrition.sugar_g != null) rows.push(dailyTargetBar("Sugar", product.nutrition.sugar_g, targets.sugar_g, "g"));
  if (!product.isOpenFoodFacts || product.nutrition.protein_g > 0) rows.push(dailyTargetBar("Protein", product.nutrition.protein_g, targets.protein_g, "g"));
  if (product.nutrition.sodium_mg != null) rows.push(dailyTargetBar("Sodium", product.nutrition.sodium_mg, targets.sodium_mg, "mg"));
  return rows.join("");
}

function renderForYouPanel(product) {
  const targets = computeDailyTargets(state.profile);
  const summary = forYouSummary(product, targets, state.profile);
  const modeNote = state.profile.targetMode === "custom" ? "Using your custom daily targets." : "Using recommended daily targets from your profile.";

  return `<div class="panel for-you-panel">
    <div class="panel-title">For You</div>
    <div class="panel-sub">${summary}<br>${modeNote}</div>
    ${forYouBarsHTML(product, targets)}
  </div>`;
}

function applyCuratedForYouCopy() {
  if (!state.overlay || state.overlay.type !== "result") return;
  const product = getProduct(state.overlay.id);
  if (!product) return;
  const titles = [...document.querySelectorAll(".panel-title")];
  const title = titles.find((el) => el.textContent.trim() === "Fits Your Day");
  if (!title) return;
  const panel = title.closest(".panel");
  if (!panel) return;
  panel.outerHTML = renderForYouPanel(product);
}

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

function renderTargetSettings() {
  const recommended = computeRecommendedDailyTargets(state.profile);
  const active = computeDailyTargets(state.profile);
  const isCustom = state.profile.targetMode === "custom";

  return `<div class="panel target-settings-panel">
    <div class="panel-title">Daily nutrition targets</div>
    <div class="panel-sub">Used only for the personalized “For You” context. The Food Truth Score itself does not change.</div>
    <div class="target-mode-row">
      <label><input type="radio" name="target-mode" value="recommended" ${!isCustom ? "checked" : ""} onchange="setTargetMode('recommended')"> Recommended</label>
      <label><input type="radio" name="target-mode" value="custom" ${isCustom ? "checked" : ""} onchange="setTargetMode('custom')"> Set my own</label>
    </div>
    ${isCustom ? `<div class="target-custom-grid">
      ${targetInput("Calories", "calories", active.calories, "kcal")}
      ${targetInput("Protein", "protein_g", active.protein_g, "g")}
      ${targetInput("Sugar limit", "sugar_g", active.sugar_g, "g")}
      ${targetInput("Sodium limit", "sodium_mg", active.sodium_mg, "mg")}
    </div>` : `<div class="panel-sub" style="margin:10px 0 0;">Recommended: ${recommended.calories} kcal · ${recommended.protein_g}g protein · ${recommended.sugar_g}g sugar · ${recommended.sodium_mg}mg sodium</div>`}
  </div>`;
}

function targetInput(label, key, value, unit) {
  return `<label class="target-custom-field"><span>${label}</span><div><input type="number" value="${value}" onchange="setCustomTarget('${key}', this.value)"><small>${unit}</small></div></label>`;
}

function setTargetMode(mode) {
  state.profile.targetMode = mode === "custom" ? "custom" : "recommended";
  if (state.profile.targetMode === "custom" && !state.profile.customTargets) {
    const r = computeRecommendedDailyTargets(state.profile);
    state.profile.customTargets = { calories: r.calories, protein_g: r.protein_g, sugar_g: r.sugar_g, sodium_mg: r.sodium_mg };
  }
  render();
}

function setCustomTarget(key, value) {
  if (!state.profile.customTargets) state.profile.customTargets = {};
  state.profile.customTargets[key] = Number(value);
  render();
}

function injectTargetSettingsIntoAccount() {
  if (state.tab !== "account" || state.overlay) return;
  const appContent = document.querySelector(".app-content");
  if (!appContent || appContent.querySelector(".target-settings-panel")) return;
  const targetGrid = appContent.querySelector(".target-grid");
  const sectionLabels = [...appContent.querySelectorAll(".section-label")];
  const dailyLabel = sectionLabels.find((el) => el.textContent.includes("My Daily Targets"));
  if (dailyLabel) dailyLabel.textContent = state.profile.targetMode === "custom" ? "My Daily Targets — custom" : "My Daily Targets — recommended";
  if (targetGrid) targetGrid.insertAdjacentHTML("afterend", renderTargetSettings());
  else appContent.insertAdjacentHTML("beforeend", renderTargetSettings());
}

const _forYouObserver = new MutationObserver(() => {
  applyCuratedForYouCopy();
  injectTargetSettingsIntoAccount();
});
const _forYouRoot = document.getElementById("app");
if (_forYouRoot) _forYouObserver.observe(_forYouRoot, { childList: true, subtree: true });
applyCuratedForYouCopy();
injectTargetSettingsIntoAccount();
