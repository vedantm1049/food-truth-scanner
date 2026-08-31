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
const offProcessing = assessProcessing(offEquivalent);
assert.strictEqual(offProcessing.canAssess, true);
assert.ok(offProcessing.points > 0, "OFF processing evidence must produce processing penalties");

const offMissingProcessing = product({ isOpenFoodFacts: true, ingredients: [], processingContext: { additiveTags: [], additiveDataAvailable: false } });
assert.strictEqual(assessProcessing(offMissingProcessing).canAssess, false, "Missing OFF processing evidence must not be treated as clean");

const allergenOnly = product({ concernMarkers: ["May contain milk and soy (cross-contact)"], ingredients: [{ name: "Wheat", flag: null, reason: "allergen" }] });
assert.strictEqual(assessProcessing(allergenOnly).points, 0, "Allergen information must not count as processing");

const highSatFatNote = product({ concernMarkers: ["Saturated fat is high for the size"], ingredients: [{ name: "Butter", flag: null, reason: "" }] });
assert.strictEqual(assessProcessing(highSatFatNote).points, 0, "Nutrition warnings must not be double-counted as processing");

const highSugar = product({ nutrition: { calories:300, sugar_g:30, satFat_g:2, sodium_mg:250, fiber_g:8, protein_g:20 }, ingredients:[{name:"Whole oats"}] });
const highSugarResult = computeCaloScore(highSugar);
assert.strictEqual(highSugarResult.breakdown.proteinBonus, 0);
assert.strictEqual(highSugarResult.breakdown.fiberBonus, 0);

console.log("Comprehensive scoring parity tests passed.");
