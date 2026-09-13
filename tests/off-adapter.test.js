const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const scoring=fs.readFileSync(path.join(__dirname,"..","scoring.js"),"utf8"),off=fs.readFileSync(path.join(__dirname,"..","open-food-facts.js"),"utf8"),context={URL};
vm.runInNewContext(`${scoring}\n${off}\nthis.__off={offNumber,offCategory,offIngredients,offProcessingContext,offMapAllergenTags,offServingMultiplier,offPer100WithServingFallback,offSodiumMgPer100,adaptOpenFoodFactsProduct,computeOpenFoodFactsScore};`,context);
const{offNumber,offCategory,offIngredients,offProcessingContext,offMapAllergenTags,offServingMultiplier,offPer100WithServingFallback,offSodiumMgPer100,adaptOpenFoodFactsProduct,computeOpenFoodFactsScore}=context.__off;

assert.strictEqual(offNumber(null),null);assert.strictEqual(offNumber(""),null);assert.strictEqual(offNumber("0"),0);
assert.strictEqual(offCategory({categories_tags:["en:dairies","en:yogurts","en:milk-products"]}),"other_dairy_products");
assert.strictEqual(offCategory({categories_tags:["en:beverages","en:orange-juices"]}),"beverages");
const wheat=offMapAllergenTags(["en:wheat"]);assert.ok(wheat.includes("wheat")&&wheat.includes("gluten"));
const barley=offMapAllergenTags(["en:barley"]);assert.ok(barley.includes("gluten")&&!barley.includes("wheat"));
const nested=offIngredients({ingredients:[{text:"Chocolate",ingredients:[{text:"Sugar"},{text:"Cocoa butter"}]},{text:"Milk powder"}]});assert.ok(nested.map(x=>x.name).includes("Sugar"));
assert.strictEqual(offProcessingContext({additives_tags:[]}).novaGroup,null);

assert.strictEqual(offServingMultiplier("40 g"),.4);assert.strictEqual(offServingMultiplier("200 ml"),2);assert.strictEqual(offServingMultiplier("1 packet"),null,"unparseable serving labels must not be treated as 100g");assert.strictEqual(offServingMultiplier(""),null);
assert.strictEqual(offPer100WithServingFallback({sugars_100g:5,sugars_serving:99},"sugars","40g"),5,"per-100 value must win over serving fallback");
assert.strictEqual(offPer100WithServingFallback({sugars_serving:2},"sugars","40g"),5,"per-serving nutrients should convert to per 100g");
assert.strictEqual(offPer100WithServingFallback({sugars_serving:2},"sugars",""),null,"serving fallback needs a valid serving size");
assert.strictEqual(offPer100WithServingFallback({sugars_serving:2},"sugars","1 packet"),null,"non-mass serving labels must not be assumed to equal 100g");
assert.strictEqual(offSodiumMgPer100({sodium_100g:0.05},"40g"),50,"direct sodium should be preferred");
assert.strictEqual(offSodiumMgPer100({salt_100g:1},"40g"),400,"salt should convert to sodium using sodium = salt / 2.5");
assert.strictEqual(offSodiumMgPer100({salt_serving:0.4},"40g"),400,"per-serving salt should convert to per-100 sodium");

const base={product_name:"Test yoghurt",brands:"Test Brand",categories_tags:["en:yogurts"],nutriments:{"energy-kcal_100g":80,fat_100g:4,sugars_100g:5,"saturated-fat_100g":1,sodium_100g:.05,proteins_100g:8,fiber_100g:0},ingredients:[{text:"Milk"}],additives_tags:[],allergens_tags:["en:milk"],traces_tags:["en:nuts"]};
const adapted=adaptOpenFoodFactsProduct("1234567890123",base);assert.strictEqual(adapted.canScore,true);assert.strictEqual(adapted.servingSizeG,100);assert.strictEqual(adapted.nutrition.totalFat_g,4);
const nutritionOnly=adaptOpenFoodFactsProduct("1234567890123",{...base,ingredients:[],ingredients_text:"",additives_tags:undefined,nova_group:undefined});assert.strictEqual(nutritionOnly.canScore,true);assert.strictEqual(nutritionOnly.scoreDataQuality,"nutrition-only");
const saltOnly=adaptOpenFoodFactsProduct("1234567890123",{...base,nutriments:{...base.nutriments,sodium_100g:null,salt_100g:1}});assert.strictEqual(saltOnly.canScore,true);assert.strictEqual(saltOnly.nutrition.sodium_mg,400);

const servingOnly=adaptOpenFoodFactsProduct("8904063230010",{product_name:"Serving-only test",brands:"Test",serving_size:"40 g",categories_tags:["en:snacks"],nutriments:{"energy-kcal_serving":200,fat_serving:16,sugars_serving:2,"saturated-fat_serving":4,salt_serving:.4,proteins_serving:6,fiber_serving:2},ingredients:[{text:"Test ingredient"}],additives_tags:[]});
assert.strictEqual(servingOnly.canScore,true,"complete per-serving core nutrition with a valid serving size should score");
assert.strictEqual(servingOnly.nutrition.sugar_g,2);assert.strictEqual(servingOnly.nutrition.satFat_g,4);assert.strictEqual(servingOnly.nutrition.sodium_mg,160);assert.strictEqual(servingOnly.nutrition.protein_g,6);assert.strictEqual(servingOnly.nutrition.totalFat_g,16);

const missing=adaptOpenFoodFactsProduct("1234567890123",{...base,nutriments:{...base.nutriments,sugars_100g:null}});assert.strictEqual(missing.canScore,true,"partial core nutrition should produce a provisional score");assert.strictEqual(missing.nutrition.sugar_g,null);assert.strictEqual(missing.scoreDataQuality,"provisional-limited");
const oneCore=adaptOpenFoodFactsProduct("1234567890123",{...base,nutriments:{"energy-kcal_100g":300,fat_100g:20,sodium_100g:.3}});assert.strictEqual(oneCore.canScore,true);assert.strictEqual(oneCore.scoreDataQuality,"provisional-insufficient");
const densityOnly=adaptOpenFoodFactsProduct("1234567890123",{product_name:"Dense snack",brands:"Test",categories_tags:["en:snacks"],nutriments:{"energy-kcal_100g":580,fat_100g:40},ingredients:[],additives_tags:undefined});assert.strictEqual(densityOnly.canScore,true,"energy/fat evidence alone should allow a low-confidence directional score");assert.ok(computeOpenFoodFactsScore(densityOnly).breakdown.densityPts>0);
const noEvidence=adaptOpenFoodFactsProduct("1234567890123",{product_name:"Mystery",brands:"Test",categories_tags:["en:snacks"],nutriments:{},ingredients:[],additives_tags:undefined});assert.strictEqual(noEvidence.canScore,false);
const unsafe=adaptOpenFoodFactsProduct("1234567890123",{...base,image_front_url:"javascript:alert(1)"});assert.strictEqual(unsafe.image,"");
console.log("Open Food Facts adapter tests passed.");
