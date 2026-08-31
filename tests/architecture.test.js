const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const bootstrap = fs.readFileSync(path.join(root, "bootstrap.js"), "utf8");

const obsoleteRuntimeFiles = [
  "catalog-overrides.js",
  "off-runtime.js",
  "score-parity-runtime.js",
  "ui-correctness-runtime.js",
  "scanner-runtime.js",
];

for (const file of obsoleteRuntimeFiles) {
  assert.strictEqual(fs.existsSync(path.join(root, file)), false, `${file} must not return as a post-load runtime patch`);
  assert.strictEqual(index.includes(file), false, `${file} must not be wired in index.html`);
}

const requiredFeatureFiles = [
  "catalog-policy.js",
  "methodology.js",
  "open-food-facts-ui.js",
  "personalization-feature.js",
  "nutrient-ui.js",
  "scanner.js",
  "branding.js",
  "bootstrap.js",
];
for (const file of requiredFeatureFiles) {
  assert.strictEqual(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
  assert.strictEqual(index.includes(`src=\"${file}`), true, `${file} must be wired in index.html`);
}

assert.ok(index.lastIndexOf('src="bootstrap.js') > index.lastIndexOf('src="branding.js'), "bootstrap.js must load after feature definitions");
for (const installer of [
  "installMethodology()",
  "installOpenFoodFactsUI()",
  "installPersonalization()",
  "installNutrientUI()",
  "installScanner()",
  "installBranding()",
]) {
  assert.ok(bootstrap.includes(installer), `bootstrap must compose ${installer}`);
}

console.log("Architecture composition checks passed.");
