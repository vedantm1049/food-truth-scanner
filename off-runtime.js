/* Runtime bridge for Open Food Facts comprehensive scoring. */
const _foodTruthOriginalRender = render;
const _foodTruthOriginalHandleScanResult = handleScanResult;
const _foodTruthOriginalCloseOverlay = closeOverlay;
let _offLookupToken = 0;

closeOverlay = function() {
  _offLookupToken += 1;
  return _foodTruthOriginalCloseOverlay();
};

function offEscapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function offDisplayValue(value, unit) {
  return value == null ? "Not available" : `${offEscapeHTML(value)}${unit || ""}`;
}

function offConfidenceHTML(p) {
  const c = p.dataConfidence;
  return `<div class="panel off-confidence-panel">
    <div class="panel-title">Open Food Facts data confidence</div>
    <div class="off-confidence-row">
      <span class="off-confidence-badge off-confidence-${offEscapeHTML(c.className)}">${offEscapeHTML(c.level)}</span>
      <span class="off-source-label">Community-sourced product data</span>
    </div>
    <div class="panel-sub" style="margin-top:8px;">${offEscapeHTML(c.note)}</div>
  </div>`;
}

function offScoreScopeHTML(p) {
  if (!p.canScore) return "";
  return `<div class="panel">
    <div class="panel-title">Score scope</div>
    <div class="panel-sub" style="margin-bottom:0;">This barcode uses the <b>same comprehensive scoring model</b> as curated products: nutrition plus standardized processing / ingredient signals. Open Food Facts provides the external evidence; Food Truth Scanner applies the scoring rules.</div>
  </div>`;
}

function offProcessingHTML(p, result) {
  const pr = result?.processing;
  if (!pr) return "";
  const rows = pr.signals.length
    ? pr.signals.map((signal) => `<div class="flag-row negative"><div class="dot"></div><div>${offEscapeHTML(signal.label)} · −${offEscapeHTML(signal.points)} pts</div></div>`).join("")
    : `<div class="panel-sub">No processing penalties were triggered by the available external evidence.</div>`;
  return `<div class="panel">
    <div class="panel-title">Processing assessment</div>
    <div class="panel-sub">Coverage: ${offEscapeHTML(pr.coverage)}. Based on ingredients${pr.evidence.hasNova ? `, NOVA ${offEscapeHTML(pr.evidence.novaGroup)}` : ""}${p.processingContext?.additiveDataAvailable ? ", and additive metadata" : ""}. Allergens and high sugar / saturated fat / sodium are not double-counted here.</div>
    ${rows}
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
    ${shown.map((x) => `<div class="ingredient-row"><div class="ingredient-name">${offEscapeHTML(x.name)}</div></div>`).join("")}
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
    <div class="panel-sub">${offEscapeHTML(p.servingLabel)}</div>
    ${rows.map(([label, value, unit]) => `<div class="nutrient-row"><div class="left"><div class="nlabel">${label}</div></div><div class="nval">${offDisplayValue(value, unit)}</div></div>`).join("")}
  </div>`;
}

function offScoreExplanation(p, result) {
  if (!result) return offEscapeHTML(p.verdict);
  const n = result.per100g;
  const b = result.breakdown;
  const deductions = [
    { label: "sugar", points: b.sugarPts },
    { label: "saturated fat", points: b.satFatPts },
    { label: "sodium", points: b.sodiumPts },
    { label: "processing", points: b.concernPts },
  ].filter((x) => x.points > 0).sort((a, z) => z.points - a.points);
  const bonuses = [
    { label: "protein", points: b.proteinBonus },
    { label: "fiber", points: b.fiberBonus },
  ].filter((x) => x.points > 0);
  const parts = [];
  if (deductions.length) {
    parts.push(`${deductions[0].label.charAt(0).toUpperCase() + deductions[0].label.slice(1)} is the biggest drag (−${deductions[0].points} points).`);
    if (deductions[1]?.points >= 3) parts.push(`${deductions[1].label.charAt(0).toUpperCase() + deductions[1].label.slice(1)} also pulls it down (−${deductions[1].points}).`);
  } else {
    parts.push("No meaningful nutrition or processing deductions were triggered by the available evidence.");
  }
  if (bonuses.length) {
    const text = bonuses.map((x) => `${x.label} +${x.points}`).join(" and ");
    parts.push(`${text.charAt(0).toUpperCase() + text.slice(1)} helps the score.`);
  } else if (result.bonusZeroedByMaxedAxis && ((n.protein_g || 0) > 0 || (n.fiber_g || 0) > 0)) {
    parts.push("Protein or fiber does not offset the score because at least one negative nutrient is already in the high range.");
  }
  return parts.join(" ");
}

function offExternalThumbHTML(p) {
  const emoji = CATEGORY_EMOJI[p.category] || "🛒";
  const image = p.image
    ? `<img src="${offEscapeHTML(p.image)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" onload="this.previousElementSibling.style.display='none'" />`
    : "";
  return `<div class="thumb-lg" style="position:relative;"><span class="emoji-fallback" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${emoji}</span>${image}</div>`;
}

function renderOffResultOverlay(p) {
  const hits = allergenHits(p, state.profile);
  const mayHits = mayContainAllergenHits(p, state.profile);
  const result = p.canScore ? computeCaloScore(p) : null;
  const tier = result ? tierForScore(result.score) : { color: "#6b7280", bg: "#f3f4f6", label: "Score unavailable" };
  const circumference = 2 * Math.PI * 36;
  const dash = result ? (result.score / 100) * circumference : 0;

  return `<div class="overlay">
    <div class="overlay-header"><div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div></div>
    <div class="overlay-body">
      <div class="off-source-banner">External barcode result · ${result ? "Food Truth Score · " : ""}Data from Open Food Facts</div>
      ${hits.length ? `<div class="allergen-banner">${ICONS.alert}<div><div class="title">Contains ${hits.map((a) => ALLERGEN_LABELS[a]).join(", ")}</div><div class="sub">This allergen appears in Open Food Facts and matches your profile. Verify the physical label before relying on community-sourced allergen data.</div></div></div>` : ""}
      ${!hits.length && mayHits.length ? `<div class="allergen-banner allergen-banner-caution">${ICONS.alert}<div><div class="title">May contain traces of ${mayHits.map((a) => ALLERGEN_LABELS[a]).join(", ")}</div><div class="sub">Open Food Facts lists this as a trace / cross-contact warning. Verify the physical label before relying on community-sourced allergen data.</div></div></div>` : ""}

      <div class="result-product-head">
        ${offExternalThumbHTML(p)}
        <div><div class="brand">${offEscapeHTML(p.brand)}</div><div class="name">${offEscapeHTML(p.name)}</div><div class="meta">Barcode ${offEscapeHTML(p.barcode)} · ${offEscapeHTML(p.servingLabel)}</div></div>
      </div>

      <div class="score-ring-row" style="background:${tier.bg};">
        ${result ? `<div class="score-ring"><svg width="84" height="84"><circle cx="42" cy="42" r="36" stroke="#ffffffaa" stroke-width="8" fill="none"/><circle cx="42" cy="42" r="36" stroke="${tier.color}" stroke-width="8" fill="none" stroke-dasharray="${dash} ${circumference}" stroke-linecap="round"/></svg><div class="score-num" style="color:${tier.color};">${result.score}</div></div>` : `<div class="off-score-na">—</div>`}
        <div style="flex:1;"><div class="tier-name" style="color:${tier.color};">${tier.label}</div><div class="verdict" style="color:${tier.color};">${offScoreExplanation(p, result)}</div></div>
      </div>

      ${offScoreScopeHTML(p)}
      ${offConfidenceHTML(p)}
      ${result ? offProcessingHTML(p, result) : ""}
      ${offNutritionHTML(p)}
      ${offIngredientsHTML(p)}
      <div class="panel"><div class="panel-title">Data source</div><div class="panel-sub">This product's nutrition, ingredients, processing classifications and allergen information come from Open Food Facts and have not been independently verified by Food Truth Scanner.</div></div>
    </div>
  </div>`;
}

function renderOffLoadingOverlay(code) {
  return `<div class="overlay"><div class="overlay-header"><div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div></div><div class="overlay-body"><div class="empty-state"><div class="emoji">🔎</div><h3>Looking up barcode</h3><p>Checking Open Food Facts for ${offEscapeHTML(code)}…</p></div></div></div>`;
}

function renderOffErrorOverlay(code) {
  return `<div class="overlay"><div class="overlay-header"><div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div></div><div class="overlay-body"><div class="empty-state"><div class="emoji">⚠️</div><h3>Could not reach product data</h3><p>The barcode ${offEscapeHTML(code)} may still exist. Open Food Facts could not be reached reliably, so we did not label it “not found.” Try again in a moment.</p><div class="btn-primary" onclick="handleScanResult('${offEscapeHTML(code)}')">Try again</div></div></div></div>`;
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
    state.overlay = product
      ? { type: "offResult", code: normalized, product }
      : { type: "notFound", code: normalized };
  } catch (_) {
    if (token !== _offLookupToken) return;
    state.overlay = { type: "offError", code: normalized };
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
  if (state.overlay.type === "offError") {
    document.getElementById("app").insertAdjacentHTML("beforeend", renderOffErrorOverlay(state.overlay.code));
  }
};

render();
