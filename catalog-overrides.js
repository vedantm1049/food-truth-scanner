/* Runtime catalogue removals.
 * Keep this before app.js so removed SKUs never appear in Market, Browse,
 * barcode lookup, sorting, or recommendations.
 */

const REMOVED_PRODUCT_IDS = new Set([
  "calo-caramel-protein-popcorn-50g",
]);

const REMOVED_PRODUCT_BARCODES = new Set([
  "6294005102645",
]);

for (let i = PRODUCTS.length - 1; i >= 0; i -= 1) {
  if (REMOVED_PRODUCT_IDS.has(PRODUCTS[i].id) || REMOVED_PRODUCT_BARCODES.has(PRODUCTS[i].barcode)) {
    PRODUCTS.splice(i, 1);
  }
}
