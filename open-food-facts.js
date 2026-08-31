/* Open Food Facts integration for unknown scanned barcodes.
 * External products stay separate from the curated catalogue but use the same
 * comprehensive Food Truth Score: nutrition + processing/ingredient evidence.
 */

const OFF_API_BASE = "https://world.openfoodfacts.org/api/v2/product";

function offFirstString(value) { if (Array.isArray(value)) return value.find(Boolean) || ""; return value || ""; }
function offNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function offPer100(nutriments, key) { return offNumber(nutriments?.[`${key}_100g`]); }
function offServingMultiplier(servingSize, productQuantity) {
  const raw = String(servingSize || "").toLowerCase().replace(/,/g, ".");
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml)/);
  if (match) return Number(match[1]) / 100;
  const quantity = String(productQuantity || "").toLowerCase().replace(/,/g, ".");
  const qMatch = quantity.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml)/);
  return qMatch ? Number(qMatch[1]) / 100 : 1;
}
function offCategory(product) {
  const tags = product.categories_tags || [];
  if (tags.some((x) => /beverage|drink|juice|soda|water|milk/.test(x))) return "beverages";
  if (tags.some((x) => /yogurt|yoghurt|dairy/.test(x))) return "other_dairy_products";
  if (tags.some((x) => /bread|bakery|pastr|croissant/.test(x))) return "longer_life_bakery";
  if (tags.some((x) => /cereal|breakfast/.test(x))) return "breakfast";
  return "snacks";
}
function offAllergens(product) {
  const text = (product.allergens_tags || []).join(" ").toLowerCase();
  const out = [];
  [["dairy",/milk|dairy/],["soy",/soy|soya/],["peanut",/peanut/],["tree_nuts",/(?:^|[:\s-])nuts(?:$|[\s-])|almond|cashew|hazelnut|pistachio|walnut|pecan|macadamia|brazil[-\s]?nut/],["eggs",/egg/],["fish",/fish/],["shellfish",/shellfish|crustacean|mollusc/],["sesame",/sesame/],["wheat",/wheat/]].forEach(([key,rx])=>{if(rx.test(text))out.push(key);});
  return [...new Set(out)];
}
function offIngredients(product) {
  if (Array.isArray(product.ingredients) && product.ingredients.length) return product.ingredients.map((x)=>x.text||x.id||"").filter(Boolean).slice(0,60).map((name)=>({name,flag:null,reason:""}));
  const text = product.ingredients_text || "";
  return text ? text.split(/[,;]+/).map((x)=>x.trim()).filter(Boolean).slice(0,60).map((name)=>({name,flag:null,reason:""})) : [];
}
function offProcessingContext(product) {
  const novaRaw = offNumber(product.nova_group);
  const novaGroup = novaRaw && novaRaw >= 1 && novaRaw <= 4 ? Math.round(novaRaw) : null;
  const additiveTags = Array.isArray(product.additives_tags) ? product.additives_tags.filter(Boolean) : [];
  const additiveDataAvailable = Array.isArray(product.additives_tags);
  const notes = [];
  if (novaGroup === 4) notes.push("Open Food Facts classifies this product as NOVA 4 (ultra-processed).");
  else if (novaGroup) notes.push(`Open Food Facts lists this as NOVA ${novaGroup}.`);
  if (additiveTags.length) notes.push(`${additiveTags.length} additive tag${additiveTags.length===1?" is":"s are"} listed in the external record.`);
  return { novaGroup, additiveCount:additiveTags.length, additiveTags, additiveDataAvailable, note:notes.join(" "), available:Boolean(novaGroup || additiveDataAvailable) };
}
function offConfidence(product, processingCoverage) {
  const n = product.nutriments || {};
  const core = ["sugars_100g","saturated-fat_100g","sodium_100g"];
  let points = core.filter((k)=>Number.isFinite(Number(n[k]))).length * 2;
  if (product.product_name) points++; if (product.brands) points++;
  if (product.ingredients_text || (product.ingredients || []).length) points += 2;
  if (product.image_front_url) points++;
  if (Number.isFinite(Number(product.completeness))) points += Number(product.completeness)>=0.8?2:Number(product.completeness)>=0.5?1:0;
  if (processingCoverage === "medium") points = Math.min(points, 8);
  if (points >= 10) return {level:"High",className:"high",note:"Core nutrition and processing evidence are well populated in Open Food Facts."};
  if (points >= 7) return {level:"Medium",className:"medium",note:"Enough evidence to score, but some product or processing fields are incomplete or community-sourced."};
  return {level:"Low",className:"low",note:"Open Food Facts has limited evidence for this product. Treat the result as directional and verify the label."};
}
function adaptOpenFoodFactsProduct(code, product) {
  const nutriments = product.nutriments || {};
  const multiplier = offServingMultiplier(product.serving_size, product.quantity);
  const per100 = { calories:offPer100(nutriments,"energy-kcal"), sugar_g:offPer100(nutriments,"sugars"), satFat_g:offPer100(nutriments,"saturated-fat"), sodium_mg:(()=>{const g=offPer100(nutriments,"sodium");return g==null?null:g*1000;})(), fiber_g:offPer100(nutriments,"fiber"), protein_g:offPer100(nutriments,"proteins") };
  const nutritionComplete = per100.sugar_g != null && per100.satFat_g != null && per100.sodium_mg != null;
  const servingLabel = product.serving_size || product.quantity || "100g / 100ml reference";
  const nutrition = { calories:per100.calories==null?null:+(per100.calories*multiplier).toFixed(1), sugar_g:per100.sugar_g==null?null:+(per100.sugar_g*multiplier).toFixed(1), satFat_g:per100.satFat_g==null?null:+(per100.satFat_g*multiplier).toFixed(1), sodium_mg:per100.sodium_mg==null?null:Math.round(per100.sodium_mg*multiplier), fiber_g:per100.fiber_g==null?null:+(per100.fiber_g*multiplier).toFixed(1), protein_g:per100.protein_g==null?null:+(per100.protein_g*multiplier).toFixed(1) };
  const ingredients = offIngredients(product);
  const processingContext = offProcessingContext(product);
  const provisional = { isOpenFoodFacts:true, ingredients, processingContext, concernMarkers:[] };
  const processing = assessProcessing(provisional);
  const canScore = nutritionComplete && processing.canAssess;
  const missingReason = !nutritionComplete ? "Open Food Facts is missing sugar, saturated fat or sodium data." : !processing.canAssess ? "Open Food Facts does not have enough ingredient, additive or NOVA evidence to assess processing fairly." : "";
  return { id:`off-${code}`, barcode:String(code), name:product.product_name||product.product_name_en||"Unknown product", brand:offFirstString(product.brands)||"Unknown brand", category:offCategory(product), servingLabel, servingSizeG:Math.max(1,multiplier*100), isCaloMarket:false, isOpenFoodFacts:true, image:product.image_front_url||product.image_url||"", nutrition, allergens:offAllergens(product), mayContainAllergens:[], concernMarkers:[], positiveFlags:[], ingredients, processingContext, verdict:canScore?"":`Score unavailable because ${missingReason}`, dataConfidence:offConfidence(product,processing.coverage), offUrl:`https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`, canScore, scoreScope:"comprehensive-parity", processingAssessed:processing.canAssess };
}
async function fetchOpenFoodFactsProduct(code) {
  const fields = ["code","product_name","product_name_en","brands","quantity","serving_size","image_front_url","image_url","nutriments","ingredients","ingredients_text","allergens_tags","categories_tags","completeness","nova_group","additives_tags"].join(",");
  const response = await fetch(`${OFF_API_BASE}/${encodeURIComponent(code)}.json?fields=${encodeURIComponent(fields)}`, {headers:{Accept:"application/json"}});
  if (!response.ok) return null;
  const payload = await response.json();
  return payload && payload.status===1 && payload.product ? adaptOpenFoodFactsProduct(code,payload.product) : null;
}
