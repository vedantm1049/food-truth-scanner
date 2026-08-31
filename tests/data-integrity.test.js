const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const scoring = fs.readFileSync(path.join(root, "scoring.js"), "utf8");
const profile = fs.readFileSync(path.join(root, "profile.js"), "utf8");
const data = fs.readFileSync(path.join(root, "data.js"), "utf8");
const policy = fs.readFileSync(path.join(root, "catalog-policy.js"), "utf8");

const context = {};
vm.runInNewContext(
  `${scoring}\n${profile}\n${data}\n${policy}\nthis.__fts = { PRODUCTS, DEFAULT_PROFILE, ALL_ALLERGENS, ACTIVITY_MULTIPLIERS, computeCaloScore };`,
  context
);
const { PRODUCTS, DEFAULT_PROFILE, ALL_ALLERGENS, ACTIVITY_MULTIPLIERS, computeCaloScore } = context.__fts;

function validGtin(code) {
  const raw = String(code || "");
  if (!/^\d+$/.test(raw) || ![8, 12, 13, 14].includes(raw.length)) return false;
  const digits = raw.split("").map(Number);
  const check = digits.pop();
  const total = digits.reverse().reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (total % 10)) % 10 === check;
}

assert.ok(PRODUCTS.length >= 5, "active catalogue must not be empty");

const ids = new Set();
const barcodes = new Set();
const confidenceCounts = {};
const allowedConfidence = new Set(["high", "medium-high", "medium", "low"]);
const allergenKeys = new Set(ALL_ALLERGENS);
const productIds = new Set(PRODUCTS.map((p) => p.id));

for (const p of PRODUCTS) {
  assert.ok(p.id && typeof p.id === "string", "every product needs an id");
  assert.ok(!ids.has(p.id), `duplicate product id: ${p.id}`);
  ids.add(p.id);

  assert.ok(validGtin(p.barcode), `invalid GTIN checksum/shape for ${p.id}: ${p.barcode}`);
  assert.ok(!barcodes.has(p.barcode), `duplicate barcode: ${p.barcode}`);
  barcodes.add(p.barcode);

  assert.ok(Number.isFinite(p.servingSizeG) && p.servingSizeG > 0, `invalid serving size for ${p.id}`);
  assert.ok(p.servingLabel, `missing serving label for ${p.id}`);

  const core = ["sugar_g", "satFat_g", "sodium_mg"];
  for (const key of core) {
    assert.ok(Number.isFinite(p.nutrition?.[key]) && p.nutrition[key] >= 0, `missing/invalid ${key} for ${p.id}`);
  }
  for (const key of ["calories", "fiber_g", "protein_g"]) {
    const value = p.nutrition?.[key];
    assert.ok(value == null || (Number.isFinite(value) && value >= 0), `invalid ${key} for ${p.id}`);
  }

  assert.ok(Array.isArray(p.ingredients) && p.ingredients.length > 0, `missing ingredient evidence for ${p.id}`);
  assert.ok(Array.isArray(p.allergens), `allergens must be an array for ${p.id}`);
  assert.ok(Array.isArray(p.mayContainAllergens), `trace allergens must be an array for ${p.id}`);
  for (const allergen of [...p.allergens, ...p.mayContainAllergens]) {
    assert.ok(allergenKeys.has(allergen), `unknown allergen key ${allergen} on ${p.id}`);
  }

  assert.ok(allowedConfidence.has(p.dataConfidence), `unsupported dataConfidence '${p.dataConfidence}' on ${p.id}`);
  confidenceCounts[p.dataConfidence] = (confidenceCounts[p.dataConfidence] || 0) + 1;
  assert.ok(Array.isArray(p.sourceUrls) && p.sourceUrls.length > 0, `missing source trail for ${p.id}`);

  if (p.image) assert.ok(fs.existsSync(path.join(root, p.image)), `missing image file for ${p.id}: ${p.image}`);
  if (p.isCaloMarket) assert.ok(Number.isFinite(p.priceAED) && p.priceAED > 0, `invalid Market price for ${p.id}`);
  if (p.swapId) assert.ok(productIds.has(p.swapId), `swap target does not exist for ${p.id}: ${p.swapId}`);

  const score = computeCaloScore(p).score;
  assert.ok(Number.isFinite(score) && score >= 0 && score <= 100, `invalid score for ${p.id}: ${score}`);
}

assert.ok(DEFAULT_PROFILE && Number.isFinite(DEFAULT_PROFILE.age) && DEFAULT_PROFILE.age > 0, "default profile must have a valid age");
assert.ok(Number.isFinite(DEFAULT_PROFILE.heightCm) && DEFAULT_PROFILE.heightCm > 0, "default profile must have a valid height");
assert.ok(Number.isFinite(DEFAULT_PROFILE.weightKg) && DEFAULT_PROFILE.weightKg > 0, "default profile must have a valid weight");
assert.ok(ACTIVITY_MULTIPLIERS[DEFAULT_PROFILE.activityLevel], "default profile must use a known activity level");

console.log(`Curated catalogue integrity passed for ${PRODUCTS.length} active products.`);
console.log(`Data confidence mix: ${JSON.stringify(confidenceCounts)}`);
