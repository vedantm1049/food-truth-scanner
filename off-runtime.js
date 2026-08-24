/* Runtime bridge for Open Food Facts.
 * Intentionally separate from the curated Market PDP so existing product
 * behavior stays untouched.
 */

const _foodTruthOriginalRender = render;
const _foodTruthOriginalHandleScanResult = handleScanResult;
let _offLookupToken = 0;

function offDisplayValue(value, unit) {
  return value == null ? "Not available" : `${value}${unit || ""}`;
}

function offConfidenceHTML(p) {
  const c = p.dataConfidence;
  return `<div class="panel off-confidence-panel">
    <div class="panel-title">Open Food Facts data confidence</div>
    <div class="off-confidence-row">
      <span class="off-confidence-badge off-confidence-${c.className}">${c.level}</span>
      <span class="off-source-label">Community-sourced product data</span>
    </div>
    <div class="panel-sub" style="margin-top:8px;">${c.note}</div>
  </div>`;
}

function offIngredientsHTML(p) {
  if (!p.ingredients.length) {
    return `<div class="panel"><div class="panel-title">Ingredients</div><div class="panel-sub">Ingredient data is not available for this barcode in Open Food Facts.</div></div>`;
  }
  const shown = state.ingredientsExpanded ? p.ingredients : p.ingredients.slice(0, 5);
  return `<div class="panel">
    <div class="panel-title">Ingredients</div>
    <div class="panel-sub">As listed in Open Food Facts. Food Truth Scanner has not independently verified this label.</div>
    ${shown.map((x) => `<div class="ingredient-row"><div class="ingredient-name">${x.name}</div></div>`).join("")}
    ${p.ingredients.length > 5 ? `<div class="ingredients-toggle" onclick="toggleIngredients()">${state.ingredientsExpanded ? "Hide details" : `View all ${p.ingredients.length} ingredients`}</div>` : ""}
  </div>`;
}

function offNutritionHTML(p) {
  const rows = [
    ["Calories", p.nutrition.calories, " kcal"],
    ["Sugar", p.nutrition.sugar_g, "g"],
    ["Saturated Fat", p.nutrition.satFat_g, "g"],
    ["Sodium", p.nutrition.sodium_mg, "mg"],
    ["Fiber", p.nutrition.fiber_g, "g"],
    ["Protein", p.nutrition.protein_g, "g"],
  ];
  return `<div class="panel">
    <div class="panel-title">Nutrient Breakdown</div>
    <div class="panel-sub">${p.servingLabel}</div>
    ${rows.map(([label, value, unit]) => `<div class="nutrient-row"><div class="left"><div class="nlabel">${label}</div></div><div class="nval">${offDisplayValue(value, unit)}</div></div>`).join("")}
  </div>`;
}

function renderOffResultOverlay(p) {
  const hits = allergenHits(p, state.profile);
  const result = p.canScore ? computeCaloScore(p) : null;
  const tier = result ? tierForScore(result.score) : { color: "#6b7280", bg: "#f3f4f6", label: "Score unavailable" };
  const circumference = 2 * Math.PI * 36;
  const dash = result ? (result.score / 100) * circumference : 0;

  return `<div class="overlay">
    <div class="overlay-header"><div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div></div>
    <div class="overlay-body">
      <div class="off-source-banner">External barcode result · Data from Open Food Facts</div>
      ${hits.length ? `<div class="allergen-banner">${ICONS.alert}<div><div class="title">Contains ${hits.map((a) => ALLERGEN_LABELS[a]).join(", ")}</div><div class="sub">This allergen appears in Open Food Facts and matches your profile. Verify the physical label before relying on community-sourced allergen data.</div></div></div>` : ""}

      <div class="result-product-head">
        ${thumbHTML(p, "thumb-lg")}
        <div><div class="brand">${p.brand}</div><div class="name">${p.name}</div><div class="meta">Barcode ${p.barcode} · ${p.servingLabel}</div></div>
      </div>

      <div class="score-ring-row" style="background:${tier.bg};">
        ${result ? `<div class="score-ring"><svg width="84" height="84"><circle cx="42" cy="42" r="36" stroke="#ffffffaa" stroke-width="8" fill="none"/><circle cx="42" cy="42" r="36" stroke="${tier.color}" stroke-width="8" fill="none" stroke-dasharray="${dash} ${circumference}" stroke-linecap="round"/></svg><div class="score-num" style="color:${tier.color};">${result.score}</div></div>` : `<div class="off-score-na">—</div>`}
        <div style="flex:1;"><div class="tier-name" style="color:${tier.color};">${tier.label}</div><div class="verdict" style="color:${tier.color};">${p.verdict}</div></div>
        ${result ? `<div class="score-info-btn" style="color:${tier.color};" onclick="openMethodology()" aria-label="How we calculate this score">${ICONS.info}</div>` : ""}
      </div>

      ${offConfidenceHTML(p)}
      ${offNutritionHTML(p)}
      ${offIngredientsHTML(p)}

      <div class="panel">
        <div class="panel-title">About this result</div>
        <div class="panel-sub">Product facts come from Open Food Facts. The 0–100 score, when enough nutrition data exists, is calculated locally by Food Truth Scanner using the same transparent nutrition rules as the curated catalogue. No product comparison or replacement recommendation is generated for external products.</div>
      </div>

      ${result ? `<div class="methodology-link" onclick="openMethodology()">${ICONS.info}<span>How we calculate this</span></div>` : ""}
    </div>
  </div>`;
}

function renderOffLoadingOverlay(code) {
  return `<div class="overlay"><div class="overlay-header"><div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div></div><div class="overlay-body"><div class="empty-state"><div class="emoji">🔎</div><h3>Looking up barcode</h3><p>Checking Open Food Facts for ${code}…</p></div></div></div>`;
}

handleScanResult = async function(code) {
  const normalized = String(code || "").trim();
  if (!normalized) return;

  // Curated catalogue always wins and keeps the exact existing PDP.
  const curated = getProductByBarcode(normalized);
  if (curated) return _foodTruthOriginalHandleScanResult(normalized);

  // Explicitly removed products stay removed rather than resurfacing via OFF.
  if (typeof REMOVED_PRODUCT_BARCODES !== "undefined" && REMOVED_PRODUCT_BARCODES.has(normalized)) {
    state.manualEntryOpen = false;
    state.overlay = { type: "notFound", code: normalized };
    render();
    return;
  }

  state.manualEntryOpen = false;
  state.ingredientsExpanded = false;
  state.overlay = { type: "offLoading", code: normalized };
  render();

  const token = ++_offLookupToken;
  try {
    const product = await fetchOpenFoodFactsProduct(normalized);
    if (token !== _offLookupToken) return;
    if (product) state.overlay = { type: "offResult", code: normalized, product };
    else state.overlay = { type: "notFound", code: normalized };
  } catch (e) {
    if (token !== _offLookupToken) return;
    state.overlay = { type: "notFound", code: normalized };
  }
  render();
};

render = function() {
  _foodTruthOriginalRender();
  if (!state.overlay) return;
  if (state.overlay.type === "offLoading") {
    document.getElementById("app").insertAdjacentHTML("beforeend", renderOffLoadingOverlay(state.overlay.code));
  }
  if (state.overlay.type === "offResult") {
    document.getElementById("app").insertAdjacentHTML("beforeend", renderOffResultOverlay(state.overlay.product));
  }
};

// Render once with the extended runtime installed.
render();
