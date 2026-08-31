/* UI copy for the source-neutral scoring rule.
 * Ingredient / processing context remains visible but is intentionally kept
 * outside the 0–100 number so data-source richness cannot bias the score.
 */

renderMethodologySheet = function() {
  return `<div class="sheet-overlay" onclick="if(event.target===this) closeSheet()">
    <div class="sheet">
      <h3>How we calculate this</h3>
      <p>The 0–100 Food Truth Score uses the same nutrition inputs for every product, whether it comes from the curated catalogue or an external barcode lookup.</p>
      <div class="weight-row"><span>Sugar</span><b>up to −40 pts</b></div>
      <div class="weight-row"><span>Saturated fat</span><b>up to −15 pts</b></div>
      <div class="weight-row"><span>Sodium</span><b>up to −20 pts</b></div>
      <div class="weight-row"><span>Protein</span><b>up to +8 pts</b></div>
      <div class="weight-row"><span>Fiber</span><b>up to +6 pts</b></div>
      <p style="margin-top:14px;">Scoring is normalized per 100g/100ml so changing the serving size cannot make a product look artificially better. Sugar, saturated fat and sodium use the UK Food Standards Agency's published front-of-pack high thresholds; drinks use the stricter drink thresholds.</p>
      <p>Protein and fiber bonuses do not apply once sugar, saturated fat or sodium reaches its high threshold, so one favorable macro cannot erase a material negative.</p>
      <p><b>Ingredient and processing context is deliberately separate from the number.</b> Curated products can have richer manually reviewed ingredient notes, while Open Food Facts records vary in completeness. Penalizing only the products with richer data would make the score source-dependent. Instead, the numeric score stays comparable and ingredient/processing information is shown alongside it with its data source and confidence.</p>
      <p>Allergens are also separate from the score and are surfaced as safety alerts whenever they match the user's profile.</p>
      <div class="btn-secondary" style="margin-top:16px;" onclick="closeSheet()">Close</div>
    </div>
  </div>`;
};

if (typeof offScoreScopeHTML === "function") {
  offScoreScopeHTML = function(p) {
    if (!p.canScore) return "";
    return `<div class="panel">
      <div class="panel-title">Score scope</div>
      <div class="panel-sub" style="margin-bottom:0;">This barcode uses the <b>same source-neutral nutrition score</b> as curated products. Ingredient and processing context is shown separately and never changes the 0–100 score, because external ingredient records can be incomplete or community-maintained.</div>
    </div>`;
  };
}

if (typeof offConfidenceHTML === "function") {
  const _sourceNeutralConfidenceHTML = offConfidenceHTML;
  offConfidenceHTML = function(p) {
    const base = _sourceNeutralConfidenceHTML(p);
    const context = p.processingContext;
    if (!context?.available) return base;
    const nova = context.novaGroup ? `<div class="flag-row ${context.novaGroup === 4 ? "negative" : ""}"><div class="dot"></div><div>NOVA ${context.novaGroup}${context.novaGroup === 4 ? " · ultra-processed" : ""}</div></div>` : "";
    const additives = context.additiveCount ? `<div class="flag-row"><div class="dot"></div><div>${context.additiveCount} additive tag${context.additiveCount === 1 ? "" : "s"} listed by Open Food Facts</div></div>` : "";
    return `${base}<div class="panel">
      <div class="panel-title">Processing context</div>
      <div class="panel-sub">External classification from Open Food Facts. Shown for transparency; it does not change the numeric score.</div>
      ${nova}${additives}
    </div>`;
  };
}
