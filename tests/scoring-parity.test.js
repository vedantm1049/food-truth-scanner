const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "scoring.js"), "utf8");
const context = {};
vm.runInNewContext(`${source}\nthis.__scoring = { computeCaloScore, assessProcessing };`, context);
const { computeCaloScore, assessProcessing } = context.__scoring;

function product(overrides = {}) {
  return {
    category: "snacks",
    servingSizeG: 100,
    nutrition: { calories: 300, sugar_g: 8, satFat_g: 2, sodium_mg: 250, fiber_g: 3, protein_g: 6 },
    concernMarkers: [],
    ingredients: [],
    ...overrides,
  };
}

const clean = product({ ingredients: [{ name: "Whole oats", flag: null, reason: "" }] });
const processedCurated = product({ ingredients: [
  { name: "Sucralose", flag: "caution", reason: "Artificial sweetener" },
  { name: "Potassium Sorbate", flag: "caution", reason: "Preservative" },
  { name: "E471", flag: "caution", reason: "Emulsifier" },
] });
assert.ok(computeCaloScore(processedCurated).score < computeCaloScore(clean).score, "Processing evidence must lower the score");

const offEquivalent = product({
  isOpenFoodFacts: true,
  ingredients: [{ name: "sucralose" }, { name: "potassium sorbate" }, { name: "e471" }],
  processingContext: { novaGroup: 4, additiveTags: ["en:e955", "en:e202", "en:e471"], additiveDataAvailable: true, note: "NOVA 4 ultra-processed" },
});
const curatedProcessing = assessProcessing(processedCurated);
const offProcessing = assessProcessing(offEquivalent);
assert.strictEqual(offProcessing.canAssess, true);
assert.ok(offProcessing.points > 0, "OFF processing evidence must produce processing penalties");
assert.strictEqual(
  offProcessing.points,
  curatedProcessing.points,
  "Equivalent ingredient evidence must not receive extra points merely because OFF also exposes NOVA metadata"
);

const offTagsOnly = product({
  isOpenFoodFacts: true,
  ingredients: [],
  processingContext: {
    novaGroup: null,
    additiveTags: ["en:e955", "en:e202", "en:e471"],
    additiveDataAvailable: true,
    note: "",
  },
});
const offTagsOnlyProcessing = assessProcessing(offTagsOnly);
assert.strictEqual(offTagsOnlyProcessing.canAssess, true, "structured additive tags alone must be usable processing evidence");
assert.strictEqual(offTagsOnlyProcessing.points, 14, "sweetener, preservative and emulsifier tags should produce their three grouped penalties");
assert.deepStrictEqual(
  Array.from(offTagsOnlyProcessing.signals, (signal) => signal.key),
  ["sweeteners", "preservatives", "texture_agents"],
  "standard OFF E-number tags must map to the same processing families as named ingredients"
);

const offNovaFallback = product({
  isOpenFoodFacts: true,
  ingredients: [],
  processingContext: { novaGroup: 4, additiveTags: [], additiveDataAvailable: false, note: "NOVA 4 ultra-processed" },
});
assert.ok(assessProcessing(offNovaFallback).points > 0, "NOVA 4 must still provide a fallback processing signal when richer evidence is absent");

const offMissingProcessing = product({ isOpenFoodFacts: true, ingredients: [], processingContext: { additiveTags: [], additiveDataAvailable: false } });
assert.strictEqual(assessProcessing(offMissingProcessing).canAssess, false, "Missing OFF processing evidence must not be treated as clean");

const allergenOnly = product({ concernMarkers: ["May contain milk and soy (cross-contact)"], ingredients: [{ name: "Wheat", flag: null, reason: "allergen" }] });
assert.strictEqual(assessProcessing(allergenOnly).points, 0, "Allergen information must not count as processing");

const highSatFatNote = product({ concernMarkers: ["Saturated fat is high for the size"], ingredients: [{ name: "Butter", flag: null, reason: "" }] });
assert.strictEqual(assessProcessing(highSatFatNote).points, 0, "Nutrition warnings must not be double-counted as processing");

const highSugar = product({ nutrition: { calories: 300, sugar_g: 30, satFat_g: 2, sodium_mg: 250, fiber_g: 8, protein_g: 20 }, ingredients: [{ name: "Whole oats" }] });
const highSugarResult = computeCaloScore(highSugar);
assert.strictEqual(highSugarResult.breakdown.proteinBonus, 0);
assert.strictEqual(highSugarResult.breakdown.fiberBonus, 0);

const missingPositiveNutrients = product({
  nutrition: { calories: 300, sugar_g: 8, satFat_g: 2, sodium_mg: 250, fiber_g: null, protein_g: null },
  ingredients: [{ name: "Whole oats" }],
});
const missingPositiveResult = computeCaloScore(missingPositiveNutrients);
assert.strictEqual(missingPositiveResult.breakdown.proteinBonus, 0, "missing protein must never become a positive bonus");
assert.strictEqual(missingPositiveResult.breakdown.fiberBonus, 0, "missing fiber must never become a positive bonus");

console.log("Comprehensive scoring parity tests passed.");
