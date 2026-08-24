/* Runtime bridge for Open Food Facts.
 * External products stay separate from the curated Market catalogue.
 */

const _foodTruthOriginalRender = render;
const _foodTruthOriginalHandleScanResult = handleScanResult;
const _foodTruthOriginalCloseOverlay = closeOverlay;
let _offLookupToken = 0;

// Closing an OFF loading/result screen invalidates any in-flight lookup so an
// async response cannot reopen a result after the user has dismissed it.
closeOverlay = function() {
  _offLookupToken += 1;
  return _foodTruthOriginalCloseOverlay();
};

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

function offScoreScopeHTML(p) {
  if (!p.canScore) return "";
  return `<div class="panel">
    <div class="panel-title">Score scope</div>
    <div class="panel-sub" style="margin-bottom:0;">This external result is a <b>nutrition-based score</b> using sugar, saturated fat, sodium, protein and fiber data from Open Food Facts. The curated catalogue's manually reviewed processing/ingredient-marker penalty is not applied to external products, because Food Truth Scanner has not independently reviewed this ingredient list.</div>
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

function offScoreExplanation(p, result) {
  if (!result) return p.verdict;

  const n = result.per100g;
  const b = result.breakdown;
  const deductions = [
    { label: "sugar", points: b.sugarPts, value: n.sugar_g, unit: "g" },
    { label: "saturated fat", points: b.satFatPts, value: n.satFat_g, unit: "g" },
    { label: "sodium", points: b.sodiumPts, value: n.sodium_mg, unit: "mg" },
  ]
    .filter((x) => x.points > 0)
    .sort((a, b2) => b2.points - a.points);

  const bonuses = [
    { label: "protein", points: b.proteinBonus },
    { label: "fiber", points: b.fiberBonus },
  ].filter((x) => x.points > 0);

  const parts = [];
  if (deductions.length) {
    const lead = deductions[0];
    parts.push(`${lead.label.charAt(0).toUpperCase() + lead.label.slice(1)} is the biggest drag at ${Math.round(lead.value * 10) / 10}${lead.unit} per 100${result.isDrink ? "ml" : "g"} (−${lead.points} points).`);
    if (deductions[1] && deductions[1].points >= 3) {
      const second = deductions[1];
      parts.push(`${second.label.charAt(0).toUpperCase() + second.label.slice(1)} also pulls it down (−${second.points}).`);
    }
  } else {
    parts.push("Sugar, saturated fat and sodium are all low enough to avoid meaningful deductions.");
  }

  if (bonuses.length) {
    const bonusText = bonuses.map((x) => `${x.label} +${x.points}`).join(" and ");
    parts.push(`${bonusText.charAt(0).toUpperCase() + bonusText.slice(1)} helps the score.`);
  } else if (result.bonusZeroedByMaxedAxis && ((n.protein_g || 0) > 0 || (n.fiber_g || 0) > 0)) {
    parts.push("Protein or fiber does not offset the score because at least one negative nutrient is already in the high range.");
  }

  return parts.join(" ");
}

function renderOffResultOverlay(p) {
  const hits = allergenHits(p, state.profile);
  const result = p.canScore ? computeCaloScore(p) : null;
  const tier = result ? tierForScore(result.score) : { color: "#6b7280", bg: "#f3f4f6", label: "Score unavailable" };
  const circumference = 2 * Math.PI * 36;
  const dash = result ? (result.score / 100) * circumference : 0;
  const scoreExplanation = offScoreExplanation(p, result);

  return `<div class="overlay">
    <div class="overlay-header"><div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div></div>
    <div class="overlay-body">
      <div class="off-source-banner">External barcode result · ${result ? "Nutrition-based score · " : ""}Data from Open Food Facts</div>
      ${hits.length ? `<div class="allergen-banner">${ICONS.alert}<div><div class="title">Contains ${hits.map((a) => ALLERGEN_LABELS[a]).join(", ")}</div><div class="sub">This allergen appears in Open Food Facts and matches your profile. Verify the physical label before relying on community-sourced allergen data.</div></div></div>` : ""}

      <div class="result-product-head">
        ${thumbHTML(p, "thumb-lg")}
        <div><div class="brand">${p.brand}</div><div class="name">${p.name}</div><div class="meta">Barcode ${p.barcode} · ${p.servingLabel}</div></div>
      </div>

      <div class="score-ring-row" style="background:${tier.bg};">
        ${result ? `<div class="score-ring"><svg width="84" height="84"><circle cx="42" cy="42" r="36" stroke="#ffffffaa" stroke-width="8" fill="none"/><circle cx="42" cy="42" r="36" stroke="${tier.color}" stroke-width="8" fill="none" stroke-dasharray="${dash} ${circumference}" stroke-linecap="round"/></svg><div class="score-num" style="color:${tier.color};">${result.score}</div></div>` : `<div class="off-score-na">—</div>`}
        <div style="flex:1;"><div class="tier-name" style="color:${tier.color};">${tier.label}</div><div class="verdict" style="color:${tier.color};">${scoreExplanation}</div></div>
      </div>

      ${offScoreScopeHTML(p)}
      ${offConfidenceHTML(p)}
      ${offNutritionHTML(p)}
      ${offIngredientsHTML(p)}

      <div class="panel">
        <div class="panel-title">Data source</div>
        <div class="panel-sub">This product's nutrition, ingredients and allergen information comes from Open Food Facts and has not been independently verified by Food Truth Scanner.</div>
      </div>
    </div>
  </div>`;
}

function renderOffLoadingOverlay(code) {
  return `<div class="overlay"><div class="overlay-header"><div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div></div><div class="overlay-body"><div class="empty-state"><div class="emoji">🔎</div><h3>Looking up barcode</h3><p>Checking Open Food Facts for ${code}…</p></div></div></div>`;
}

handleScanResult = async function(code) {
  const normalized = String(code || "").trim();
  if (!normalized) return;

  const curated = getProductByBarcode(normalized);
  if (curated) return _foodTruthOriginalHandleScanResult(normalized);

  if (typeof REMOVED_PRODUCT_BARCODES !== "undefined" && REMOVED_PRODUCT_BARCODES.has(normalized)) {
    state.manualEntryOpen = false;
    state.overlay = { type: "notFound", code: normalized };
    render();
    return;
  }

  state.manualEntryOpen = false;
  state.ingredientsExpanded = false;
  state.overlay = { type: "offLoading", code: normalized };
  const token = ++_offLookupToken;
  render();

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

render();
