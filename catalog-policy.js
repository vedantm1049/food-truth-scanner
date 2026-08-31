/**
 * Food Truth Scanner — catalogue policy.
 *
 * Product data lives in data.js. Deliberate demo exclusions live here so the
 * dataset itself can remain an auditable research record while the active
 * catalogue has one explicit policy boundary.
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

function applyCatalogPolicy(products = PRODUCTS) {
  for (let i = products.length - 1; i >= 0; i -= 1) {
    if (EXCLUDED_PRODUCT_IDS.has(products[i].id) || EXCLUDED_PRODUCT_BARCODES.has(products[i].barcode)) {
      products.splice(i, 1);
    }
  }
  return products;
}

applyCatalogPolicy();
