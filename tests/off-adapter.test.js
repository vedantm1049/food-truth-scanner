const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const scoring = fs.readFileSync(path.join(__dirname, "..", "scoring.js"), "utf8");
const off = fs.readFileSync(path.join(__dirname, "..", "open-food-facts.js"), "utf8");
const context = { URL };
vm.runInNewContext(`${scoring}\n${off}\nthis.__off = { offNumber, offCategory, offIngredients, offProcessingContext, offMapAllergenTags, adaptOpenFoodFactsProduct };`, context);
const { offNumber, offCategory, offIngredients, offProcessingContext, offMapAllergenTags, adaptOpenFoodFactsProduct } = context.__off;

assert.strictEqual(offNumber(null), null, "null OFF nutrient must stay missing rather than become 0");
assert.strictEqual(offNumber(""), null, "empty OFF nutrient must stay missing rather than become 0");
assert.strictEqual(offNumber("0"), 0, "a real zero must remain zero");

assert.strictEqual(
  offCategory({ categories_tags: ["en:dairies", "en:yogurts", "en:milk-products"] }),
  "other_dairy_products",
  "yoghurt must not be misclassified as a drink just because a category contains milk"
);
assert.strictEqual(
  offCategory({ categories_tags: ["en:beverages", "en:orange-juices"] }),
  "beverages"
);

const wheatAllergens = offMapAllergenTags(["en:wheat"]);
assert.ok(wheatAllergens.includes("wheat"), "wheat must remain a distinct allergy signal");
assert.ok(wheatAllergens.includes("gluten"), "wheat must also protect a gluten-sensitive profile");
const barleyAllergens = offMapAllergenTags(["en:barley"]);
assert.ok(barleyAllergens.includes("gluten"), "barley must trigger gluten");
assert.ok(!barleyAllergens.includes("wheat"), "barley must not be misrepresented as wheat");

const nestedIngredients = offIngredients({
  ingredients: [
    { text: "Chocolate", ingredients: [{ text: "Sugar" }, { text: "Cocoa butter" }] },
    { text: "Milk powder" },
  ],
});
const ingredientNames = nestedIngredients.map((x) => x.name);
assert.ok(ingredientNames.includes("Sugar"), "nested OFF ingredients must be included in processing evidence");
assert.ok(ingredientNames.includes("Cocoa butter"), "nested OFF ingredients must be traversed recursively");

const noNova = offProcessingContext({ additives_tags: [] });
assert.strictEqual(noNova.novaGroup, null, "missing NOVA must not become NOVA 0");

const baseProduct = {
  product_name: "Test yoghurt",
  brands: "Test Brand",
  quantity: "500g",
  categories_tags: ["en:yogurts", "en:milk-products"],
  nutriments: {
    "energy-kcal_100g": 80,
    sugars_100g: 5,
    "saturated-fat_100g": 1,
    sodium_100g: 0.05,
    proteins_100g: 8,
    fiber_100g: 0,
  },
  ingredients: [{ text: "Milk" }, { text: "Yoghurt cultures" }],
  additives_tags: [],
  allergens_tags: ["en:milk"],
  traces_tags: ["en:nuts"],
};

const adapted = adaptOpenFoodFactsProduct("1234567890123", baseProduct);
assert.strictEqual(adapted.servingLabel, "100g / 100ml reference", "package quantity must not be silently treated as serving size");
assert.strictEqual(adapted.servingSizeG, 100, "missing serving size must use a 100g/ml reference");
assert.strictEqual(adapted.category, "other_dairy_products");
assert.ok(adapted.allergens.includes("dairy"));
assert.ok(adapted.mayContainAllergens.includes("tree_nuts"), "OFF trace allergens must be retained separately");
assert.strictEqual(adapted.canScore, true);

const missingCore = adaptOpenFoodFactsProduct("1234567890123", {
  ...baseProduct,
  nutriments: { ...baseProduct.nutriments, sugars_100g: null },
});
assert.strictEqual(missingCore.canScore, false, "missing core nutrition must make score unavailable");
assert.strictEqual(missingCore.nutrition.sugar_g, null, "missing core nutrient must stay null in the UI shape");

const unsafeImage = adaptOpenFoodFactsProduct("1234567890123", {
  ...baseProduct,
  image_front_url: "javascript:alert(1)",
});
assert.strictEqual(unsafeImage.image, "", "non-http image URLs must be rejected");

console.log("Open Food Facts adapter tests passed.");
