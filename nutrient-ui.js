/** Food Truth Scanner — nutrient-density presentation. */

function nutrientDensityLight(key, product) {
  const n = per100g(product);
  const value = n[key];
  const drink = isDrinkProduct(product);

  if (key === "sugar_g") {
    const low = drink ? 2.5 : 5;
    const high = drink ? 11.25 : 22.5;
    return value <= low ? "good" : value <= high ? "medium" : "high";
  }
  if (key === "satFat_g") {
    const low = drink ? 0.75 : 1.5;
    const high = drink ? 2.5 : 5;
    return value <= low ? "good" : value <= high ? "medium" : "high";
  }
  if (key === "sodium_mg") {
    const low = 120;
    const high = drink ? 300 : 600;
    return value <= low ? "good" : value <= high ? "medium" : "high";
  }
  if (key === "fiber_g") return value >= 4 ? "good" : value >= 2 ? "medium" : "high";
  if (key === "protein_g") return value >= 8 ? "good" : value >= 3 ? "medium" : "high";
  return "medium";
}

function installNutrientUI() {
  const baseResult = renderResultOverlay;
  renderResultOverlay = function(id) {
    const product = getProduct(id);
    let html = baseResult(id);
    if (!product) return html;

    const keys = ["sugar_g", "satFat_g", "sodium_mg", "fiber_g", "protein_g"];
    let index = 0;
    html = html.replace(/<div class="nutrient-dot" style="background:[^;]+;"><\/div>/g, () => {
      const key = keys[index++];
      if (!key) return '<div class="nutrient-dot"></div>';
      const light = nutrientDensityLight(key, product);
      return `<div class="nutrient-dot" style="background:${LIGHT_COLOR[light]};"></div>`;
    });

    html = html.replace(
      `<div class="panel-sub">Per serving (${product.servingLabel})</div>`,
      `<div class="panel-sub">Values per serving (${product.servingLabel}) · colour reflects per-100g/ml nutrient density</div>`
    );
    return html;
  };
}
