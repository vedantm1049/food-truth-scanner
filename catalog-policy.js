/**
 * Food Truth Scanner — catalogue policy.
 *
 * Product data lives in data.js. Deliberate exclusions and runtime identifier
 * normalization live here so the underlying research record stays auditable
 * while the active application never pretends a known placeholder is a real
 * scannable barcode.
 *
 * This file is loaded before app.js and is intentionally the only feature
 * module with a boot-time side effect.
 */

const EXCLUDED_PRODUCT_IDS = new Set([
  "calo-caramel-protein-popcorn-50g",
]);

const EXCLUDED_PRODUCT_BARCODES = new Set([
  "6294005102645",
]);

// Explicitly documented dummy identifiers in data.js. Keep the products in
// Browse/Market, but remove their scan identity at runtime.
const UNSCANNABLE_PRODUCT_IDS = new Set([
  "calo-protein-chocolate-200ml",
  "soul-pantry-tuscan-tomato-chips-50g",
]);

// Recoverable identifier normalization where the historical research record
// dropped a UPC-A leading zero. Keep that record unchanged; correct the active
// application identity here.
const BARCODE_CORRECTIONS = new Map([
  ["rubicon-coconut-water-250ml", "064579330753"],
  ["cheetos-flamin-hot-crunchy-28g", "028400037174"],
]);

function applyCatalogPolicy(products = PRODUCTS) {
  for (let i = products.length - 1; i >= 0; i -= 1) {
    const product = products[i];
    if (EXCLUDED_PRODUCT_IDS.has(product.id) || EXCLUDED_PRODUCT_BARCODES.has(product.barcode)) {
      products.splice(i, 1);
      continue;
    }
    if (UNSCANNABLE_PRODUCT_IDS.has(product.id)) product.barcode = null;
    if (BARCODE_CORRECTIONS.has(product.id)) product.barcode = BARCODE_CORRECTIONS.get(product.id);
  }
  return products;
}

applyCatalogPolicy();
