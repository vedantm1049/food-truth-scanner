/* Open Food Facts integration for unknown scanned barcodes. */

const OFF_API_BASE = "https://world.openfoodfacts.org/api/v2/product";

function offFirstString(value) { if (Array.isArray(value)) return value.find(Boolean) || ""; return value || ""; }
function offNumber(value) { if (value == null || value === "") return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
function offPer100(nutriments, key) { return offNumber(nutriments?.[`${key}_100g`]); }

function offServingMultiplier(servingSize) {
  const raw = String(servingSize || "").toLowerCase().replace(/,/g, ".");
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml)\b/);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? amount / 100 : null;
}

function offPer100WithServingFallback(nutriments, key, servingSize) {
  const direct = offPer100(nutriments, key);
  if (direct != null) return direct;
  const servingValue = offNumber(nutriments?.[`${key}_serving`]);
  if (servingValue == null) return null;
  const multiplier = offServingMultiplier(servingSize);
  if (!Number.isFinite(multiplier) || multiplier <= 0) return null;
  return servingValue / multiplier;
}

function offHttpUrl(value){if(!value)return "";try{const u=new URL(String(value));return ["https:","http:"].includes(u.protocol)?u.href:"";}catch(_){return "";}}
function offCategory(product){const j=(product.categories_tags||[]).map(x=>String(x).toLowerCase()).join(" ");if(/yogurt|yoghurt|cheese|dairy-dessert|fermented-milk/.test(j))return "other_dairy_products";if(/bread|bakery|pastr|croissant/.test(j))return "longer_life_bakery";if(/cereal|breakfast/.test(j))return "breakfast";if(/\bwater\b|beverage|drink|juice|soda|soft-drink|energy-drink|sports-drink|tea-drink|coffee-drink/.test(j))return "beverages";if(/milk|plant-based-milk|milk-substitute/.test(j))return "milk_milk_alternatives";return "snacks";}
function offMapAllergenTags(tags){const t=(tags||[]).join(" ").toLowerCase(),out=[];const map=[["dairy",/milk|dairy/],["soy",/soy|soya/],["peanut",/peanut/],["tree_nuts",/(?:^|[:\s-])nuts(?:$|[\s-])|almond|cashew|hazelnut|pistachio|walnut|pecan|macadamia|brazil[-\s]?nut/],["eggs",/egg/],["fish",/fish/],["shellfish",/shellfish|crustacean|mollusc/],["sesame",/sesame/],["wheat",/wheat/],["gluten",/gluten|wheat|barley|rye|spelt|kamut|triticale/]];map.forEach(([k,r])=>{if(r.test(t))out.push(k)});return [...new Set(out)];}
function offAllergens(p){return offMapAllergenTags(p.allergens_tags)}
function offMayContainAllergens(p){return offMapAllergenTags(p.traces_tags)}
function offFlattenIngredients(rows,out=[]){if(!Array.isArray(rows))return out;for(const row of rows){if(!row)continue;const n=row.text||row.id||"";if(n)out.push(String(n));if(Array.isArray(row.ingredients))offFlattenIngredients(row.ingredients,out);if(out.length>=100)break;}return out;}
function offIngredients(p){if(Array.isArray(p.ingredients)&&p.ingredients.length){const f=offFlattenIngredients(p.ingredients).map(x=>x.trim()).filter(Boolean),u=[...new Set(f)];if(u.length)return u.slice(0,100).map(name=>({name,flag:null,reason:""}));}const text=p.ingredients_text||"";if(!text)return [];return text.split(/[,;]+/).map(x=>x.trim()).filter(Boolean).slice(0,100).map(name=>({name,flag:null,reason:""}));}
function offProcessingContext(p){const nr=offNumber(p.nova_group),novaGroup=nr!=null&&nr>=1&&nr<=4?Math.round(nr):null,additiveTags=Array.isArray(p.additives_tags)?p.additives_tags.filter(Boolean):[],additiveDataAvailable=Array.isArray(p.additives_tags),notes=[];if(novaGroup===4)notes.push("Open Food Facts classifies this product as NOVA 4 (ultra-processed).");else if(novaGroup)notes.push(`Open Food Facts lists this as NOVA ${novaGroup}.`);if(additiveTags.length)notes.push(`${additiveTags.length} additive tag${additiveTags.length===1?" is":"s are"} listed in the external record.`);return{novaGroup,additiveCount:additiveTags.length,additiveTags,additiveDataAvailable,note:notes.join(" "),available:Boolean(novaGroup!=null||additiveDataAvailable)};}
function offSodiumMgPer100(n,s){const sodium=offPer100WithServingFallback(n,"sodium",s);if(sodium!=null)return sodium*1000;const salt=offPer100WithServingFallback(n,"salt",s);return salt==null?null:(salt/2.5)*1000;}

function offConfidence(product,processingCoverage,nutritionCoverage){const n=product.nutriments||{},s=product.serving_size;let core=0;if(offPer100WithServingFallback(n,"sugars",s)!=null)core++;if(offPer100WithServingFallback(n,"saturated-fat",s)!=null)core++;if(offSodiumMgPer100(n,s)!=null)core++;let points=core*2;if(product.product_name)points++;if(product.brands)points++;if(product.ingredients_text||(product.ingredients||[]).length)points+=2;if(product.image_front_url)points++;const c=offNumber(product.completeness);if(c!=null)points+=c>=.8?2:c>=.5?1:0;if(processingCoverage==="medium"||processingCoverage==="insufficient"||nutritionCoverage!=="full")points=Math.min(points,8);if(points>=10)return{level:"High",className:"high",note:"Core nutrition and processing evidence are well populated in Open Food Facts."};if(points>=7)return{level:"Medium",className:"medium",note:"Enough evidence to score, but some product or processing fields are incomplete or community-sourced."};return{level:"Low",className:"low",note:"Open Food Facts has limited evidence for this product. Treat the score as directional and verify the physical label."};}

function computeOpenFoodFactsScore(product){
  if(!product?.canScore)return null;
  const n100=per100g(product),isDrink=isDrinkProduct(product),processing=assessProcessing(product);
  const axes=[
    {key:"sugar",value:product.nutrition?.sugar_g,ratio:clamp01(n100.sugar_g/(isDrink?CALO_SCORE_WEIGHTS.sugar.atDrink:CALO_SCORE_WEIGHTS.sugar.at)),max:CALO_SCORE_WEIGHTS.sugar.max},
    {key:"saturated fat",value:product.nutrition?.satFat_g,ratio:clamp01(n100.satFat_g/(isDrink?CALO_SCORE_WEIGHTS.satFat.atDrink:CALO_SCORE_WEIGHTS.satFat.at)),max:CALO_SCORE_WEIGHTS.satFat.max},
    {key:"sodium",value:product.nutrition?.sodium_mg,ratio:clamp01(n100.sodium_mg/(isDrink?CALO_SCORE_WEIGHTS.sodium.atDrink:CALO_SCORE_WEIGHTS.sodium.at)),max:CALO_SCORE_WEIGHTS.sodium.max}
  ];
  const known=axes.filter(a=>a.value!=null),missing=axes.filter(a=>a.value==null).map(a=>a.key);
  const observedMax=known.reduce((s,a)=>s+a.max,0);
  const observedDeduction=known.reduce((s,a)=>s+a.ratio*a.max,0);
  const nutritionDeduction=observedMax>0?(observedDeduction/observedMax)*75:0;
  const allCoreKnown=known.length===3;
  const anyAxisMaxed=known.some(a=>a.ratio>=1);
  const proteinBonus=allCoreKnown&&!anyAxisMaxed?clamp01(n100.protein_g/CALO_SCORE_WEIGHTS.protein.at)*CALO_SCORE_WEIGHTS.protein.max:0;
  const fiberBonus=allCoreKnown&&!anyAxisMaxed?clamp01(n100.fiber_g/CALO_SCORE_WEIGHTS.fiber.at)*CALO_SCORE_WEIGHTS.fiber.max:0;
  const density=solidDensityPenalty(n100,isDrink,{
    calories:product.nutrition?.calories!=null,
    totalFat:product.nutrition?.totalFat_g!=null,
  });
  const processingPts=processing.canAssess?processing.points:0;
  const raw=100-nutritionDeduction-density.points-processingPts+proteinBonus+fiberBonus;
  return{
    score:Math.round(Math.max(0,Math.min(100,raw))),
    per100g:n100,
    isDrink,
    bonusZeroedByMaxedAxis:anyAxisMaxed||!allCoreKnown,
    processingIncludedInScore:processing.canAssess,
    scoreScope:allCoreKnown&&processing.canAssess?"comprehensive-parity":"provisional-partial",
    processing,
    density,
    provisional:!allCoreKnown||!processing.canAssess,
    assumedAxes:[],
    missingAxes:missing,
    normalizedPartialNutrition:!allCoreKnown&&known.length>0,
    breakdown:{
      sugarPts:Math.round(known.find(a=>a.key==="sugar")?.ratio*CALO_SCORE_WEIGHTS.sugar.max||0),
      satFatPts:Math.round(known.find(a=>a.key==="saturated fat")?.ratio*CALO_SCORE_WEIGHTS.satFat.max||0),
      sodiumPts:Math.round(known.find(a=>a.key==="sodium")?.ratio*CALO_SCORE_WEIGHTS.sodium.max||0),
      densityPts:Math.round(density.points),
      energyDensityPts:Math.round(density.energyPts),
      totalFatPts:Math.round(density.totalFatPts),
      concernPts:Math.round(processingPts),
      proteinBonus:Math.round(proteinBonus),
      fiberBonus:Math.round(fiberBonus),
      normalizedNutritionPts:Math.round(nutritionDeduction)
    }
  };
}

function adaptOpenFoodFactsProduct(code,product){
  const nutriments=product.nutriments||{};
  const parsedMultiplier=offServingMultiplier(product.serving_size);
  const multiplier=parsedMultiplier||1;
  const per100={
    calories:offPer100WithServingFallback(nutriments,"energy-kcal",product.serving_size),
    totalFat_g:offPer100WithServingFallback(nutriments,"fat",product.serving_size),
    sugar_g:offPer100WithServingFallback(nutriments,"sugars",product.serving_size),
    satFat_g:offPer100WithServingFallback(nutriments,"saturated-fat",product.serving_size),
    sodium_mg:offSodiumMgPer100(nutriments,product.serving_size),
    fiber_g:offPer100WithServingFallback(nutriments,"fiber",product.serving_size),
    protein_g:offPer100WithServingFallback(nutriments,"proteins",product.serving_size)
  };
  const pairs=[["sugar",per100.sugar_g],["saturated fat",per100.satFat_g],["sodium",per100.sodium_mg]],knownCoreNutrients=pairs.filter(([,v])=>v!=null).map(([n])=>n),missingCoreNutrients=pairs.filter(([,v])=>v==null).map(([n])=>n),coreKnown=knownCoreNutrients.length,nutritionCoverage=coreKnown===3?"full":coreKnown===2?"limited":"insufficient";
  const servingLabel=product.serving_size||"100g / 100ml reference";
  const nutrition={
    calories:per100.calories==null?null:+(per100.calories*multiplier).toFixed(1),
    totalFat_g:per100.totalFat_g==null?null:+(per100.totalFat_g*multiplier).toFixed(1),
    sugar_g:per100.sugar_g==null?null:+(per100.sugar_g*multiplier).toFixed(1),
    satFat_g:per100.satFat_g==null?null:+(per100.satFat_g*multiplier).toFixed(1),
    sodium_mg:per100.sodium_mg==null?null:Math.round(per100.sodium_mg*multiplier),
    fiber_g:per100.fiber_g==null?null:+(per100.fiber_g*multiplier).toFixed(1),
    protein_g:per100.protein_g==null?null:+(per100.protein_g*multiplier).toFixed(1)
  };
  const ingredients=offIngredients(product),processingContext=offProcessingContext(product);
  const name=product.product_name||product.product_name_en||"Unknown product";
  const provisional={name,isOpenFoodFacts:true,ingredients,processingContext,concernMarkers:[]};
  const processing=assessProcessing(provisional);
  const canScore=coreKnown>=1||processing.canAssess||per100.calories!=null||per100.totalFat_g!=null;
  const scoreDataQuality=nutritionCoverage==="full"?(processing.canAssess?"full":"nutrition-only"):`provisional-${nutritionCoverage}`;
  return{
    id:`off-${code}`,barcode:String(code),name,
    brand:offFirstString(product.brands)||"Unknown brand",
    category:offCategory(product),servingLabel,
    servingSizeG:Math.max(1,multiplier*100),
    isCaloMarket:false,isOpenFoodFacts:true,
    image:offHttpUrl(product.image_front_url||product.image_url),
    nutrition,
    allergens:offAllergens(product),mayContainAllergens:offMayContainAllergens(product),
    concernMarkers:[],positiveFlags:[],ingredients,processingContext,
    verdict:canScore?"":"Score unavailable because Open Food Facts has neither usable nutrition nor processing evidence for this product.",
    dataConfidence:offConfidence(product,processing.coverage,nutritionCoverage),
    offUrl:`https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`,
    canScore,
    scoreScope:nutritionCoverage==="full"&&processing.canAssess?"comprehensive-parity":"provisional-partial",
    scoreDataQuality,nutritionCoverage,knownCoreNutrients,missingCoreNutrients,processingAssessed:processing.canAssess
  };
}

async function fetchOpenFoodFactsProduct(code){const fields=["code","product_name","product_name_en","brands","quantity","serving_size","image_front_url","image_url","nutriments","ingredients","ingredients_text","allergens_tags","traces_tags","categories_tags","completeness","nova_group","additives_tags"].join(",");const response=await fetch(`${OFF_API_BASE}/${encodeURIComponent(code)}.json?fields=${encodeURIComponent(fields)}`,{headers:{Accept:"application/json"}});if(response.status===404)return null;if(!response.ok)throw new Error(`Open Food Facts request failed with ${response.status}`);const payload=await response.json();return payload&&payload.status===1&&payload.product?adaptOpenFoodFactsProduct(code,payload.product):null;}
