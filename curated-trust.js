/** Food Truth Scanner — curated evidence confidence presentation. */

const CURATED_CONFIDENCE = {
  high: {
    label: "High confidence",
    className: "high",
    note: "Key nutrition and ingredient evidence is well corroborated for this product.",
  },
  "medium-high": {
    label: "Strong confidence",
    className: "high",
    note: "Most key fields are corroborated, with a limited number of secondary-source or estimated details.",
  },
  medium: {
    label: "Medium confidence",
    className: "medium",
    note: "Some fields rely on secondary sources, estimates, or a closely matched formulation. Use the score as informed guidance, not label-level certainty.",
  },
  low: {
    label: "Low confidence · directional",
    className: "low",
    note: "Important fields use proxy or reference-product data. The score is directional and should be verified against the physical label before relying on it.",
  },
};

function curatedConfidenceHTML(product) {
  const confidence = CURATED_CONFIDENCE[product.dataConfidence] || CURATED_CONFIDENCE.medium;
  const scanNote = product.barcode == null
    ? `<div class="panel-sub" style="margin-top:8px;"><b>No verified retail barcode is available for this SKU.</b> It remains browseable in the prototype but cannot be matched by scanner or manual barcode lookup.</div>`
    : "";
  const sourceCount = Array.isArray(product.sourceUrls) ? product.sourceUrls.length : 0;

  return `<div class="panel off-confidence-panel curated-confidence-panel">
    <div class="panel-title">Curated data confidence</div>
    <div class="off-confidence-row">
      <span class="off-confidence-badge off-confidence-${confidence.className}">${confidence.label}</span>
      <span class="off-source-label">Hand-researched catalogue${sourceCount ? ` · ${sourceCount} source${sourceCount === 1 ? "" : "s"}` : ""}</span>
    </div>
    <div class="panel-sub" style="margin-top:8px;">${confidence.note}</div>
    ${scanNote}
  </div>`;
}

function installCuratedTrust() {
  const baseResult = renderResultOverlay;
  renderResultOverlay = function renderResultWithCuratedTrust(id) {
    const product = getProduct(id);
    let html = baseResult(id);
    if (!product || product.isOpenFoodFacts) return html;

    const panel = curatedConfidenceHTML(product);
    const forYouMarker = '<div class="panel for-you-panel">';
    const nutrientMarker = '<div class="panel">\n        <div class="panel-title">Nutrient Breakdown</div>';

    if (html.includes(forYouMarker)) return html.replace(forYouMarker, `${panel}\n      ${forYouMarker}`);
    if (html.includes(nutrientMarker)) return html.replace(nutrientMarker, `${panel}\n      ${nutrientMarker}`);
    return html;
  };
}
