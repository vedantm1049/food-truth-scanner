const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const scoringPath = path.join(__dirname, "..", "scoring.js");
const source = fs.readFileSync(scoringPath, "utf8");
const context = {};
vm.runInNewContext(`${source}\nthis.__scoring = { computeCaloScore };`, context);
const { computeCaloScore } = context.__scoring;

function product(overrides = {}) {
  return {
    category: "snacks",
    servingSizeG: 100,
    nutrition: {
      calories: 300,
      sugar_g: 8,
      satFat_g: 2,
      sodium_mg: 250,
      fiber_g: 3,
      protein_g: 6,
    },
    concernMarkers: [],
    ...overrides,
  };
}

const cleanMetadata = product({ concernMarkers: [] });
const richProcessingMetadata = product({
  concernMarkers: [
    "Ultra-processed marker one",
    "Ultra-processed marker two",
    "Ultra-processed marker three",
    "Ultra-processed marker four",
  ],
});

assert.strictEqual(
  computeCaloScore(cleanMetadata).score,
  computeCaloScore(richProcessingMetadata).score,
  "Identical nutrition must produce the same numeric score regardless of ingredient-metadata richness"
);

const externalShape = product({
  isOpenFoodFacts: true,
  processingAssessed: false,
  concernMarkers: [],
});

assert.strictEqual(
  computeCaloScore(cleanMetadata).score,
  computeCaloScore(externalShape).score,
  "Curated and external products with identical nutrition must score identically"
);

const highSugar = product({
  nutrition: { calories: 300, sugar_g: 30, satFat_g: 2, sodium_mg: 250, fiber_g: 8, protein_g: 20 },
});
const highSugarResult = computeCaloScore(highSugar);
assert.strictEqual(highSugarResult.breakdown.proteinBonus, 0);
assert.strictEqual(highSugarResult.breakdown.fiberBonus, 0);

console.log("Scoring parity tests passed.");
