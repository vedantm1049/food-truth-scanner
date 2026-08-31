/** Food Truth Scanner — methodology presentation. */

function renderFoodTruthMethodologySheet() {
  return `<div class="sheet-overlay" onclick="if(event.target===this) closeSheet()">
    <div class="sheet">
      <h3>How we calculate this</h3>
      <p>The 0–100 Food Truth Score uses the same comprehensive model for curated products and external barcode lookups.</p>
      <div class="weight-row"><span>Sugar</span><b>up to −40 pts</b></div>
      <div class="weight-row"><span>Saturated fat</span><b>up to −15 pts</b></div>
      <div class="weight-row"><span>Sodium</span><b>up to −20 pts</b></div>
      <div class="weight-row"><span>Processing / ingredients</span><b>up to −25 pts</b></div>
      <div class="weight-row"><span>Protein</span><b>up to +8 pts</b></div>
      <div class="weight-row"><span>Fiber</span><b>up to +6 pts</b></div>
      <p style="margin-top:14px;">Nutrition is normalized per 100g/100ml. Sugar, saturated fat and sodium use published UK Food Standards Agency front-of-pack thresholds as nutrient-density anchors; drinks use the stricter drink thresholds.</p>
      <p><b>The point weights are Food Truth Scanner prototype heuristics, not an FSA scoring system or medical recommendation.</b> They are intentionally visible so they can be challenged, tested and revised rather than hidden behind a black box.</p>
      <p>Protein and fiber bonuses do not apply once sugar, saturated fat or sodium reaches its high threshold.</p>
      <p><b>Processing is scored through one shared classifier.</b> It looks for standardized signals such as ultra-processed / reconstituted formulation, non-nutritive sweeteners and sugar alcohols, preservatives, emulsifiers / stabilizers, artificial colours / flavours, and unusually high additive load. Related additives are grouped so the same type of signal is not counted repeatedly.</p>
      <p>Curated products provide manually researched ingredient evidence. Open Food Facts products provide ingredients plus NOVA and additive metadata when available. NOVA 4 is used as fallback evidence when richer processing evidence is absent rather than as an extra source-only penalty. If an external product lacks enough processing evidence, the app does not assume it is clean — the score is marked unavailable.</p>
      <p>Allergens remain separate safety information, and high sugar / saturated fat / sodium notes are not double-counted as processing penalties.</p>
      <p>The personalized “For You” layer is separate from this score. Recommended mode does not impose a total-sugar daily limit because product labels generally report total sugar while common public-health limits refer to free or added sugar.</p>
      <div class="btn-secondary" style="margin-top:16px;" onclick="closeSheet()">Close</div>
    </div>
  </div>`;
}

function installMethodology() {
  renderMethodologySheet = renderFoodTruthMethodologySheet;
}
