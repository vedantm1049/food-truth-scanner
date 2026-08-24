/**
 * Food Truth Scanner — profile & daily target calculator.
 *
 * Recommended targets are computed from the profile using Mifflin-St Jeor
 * BMR -> activity multiplier -> goal adjustment. Users can optionally
 * override the targets that matter to the personalized "For You" layer.
 *
 * The app does not pretend to know what the user has eaten today. Products
 * are shown as a contribution to daily targets, never as an amount of a
 * fictional "remaining" allowance.
 */

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  very_active: 1.55,
  highly_active: 1.725,
};

const ACTIVITY_LABELS = {
  sedentary: "Sedentary",
  lightly_active: "Lightly active",
  very_active: "Very active",
  highly_active: "Highly active",
};

const GOAL_LABELS = {
  eat_healthy: "Eat healthy",
  lose_weight: "Lose weight",
  gain_weight: "Gain weight",
  build_muscle: "Build muscle",
  maintain_weight: "Maintain weight",
};

const ALLERGEN_LABELS = {
  eggs: "Eggs",
  dairy: "Dairy",
  soy: "Soy",
  peanut: "Peanut",
  tree_nuts: "Tree Nuts",
  fish: "Fish",
  shellfish: "Shellfish",
  sesame: "Sesame",
  wheat: "Wheat",
};

const ALL_ALLERGENS = Object.keys(ALLERGEN_LABELS);

function bmr({ gender, heightCm, weightKg, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

function goalCalorieAdjustment(goal) {
  switch (goal) {
    case "lose_weight": return -500;
    case "gain_weight": return 500;
    case "build_muscle": return 250;
    default: return 0;
  }
}

function proteinPerKg(goal) {
  switch (goal) {
    case "lose_weight": return 2.0;
    case "build_muscle": return 2.2;
    case "gain_weight": return 1.8;
    default: return 1.6;
  }
}

function fatPctOfCalories(goal) {
  return goal === "gain_weight" ? 0.3 : 0.25;
}

function computeRecommendedDailyTargets(profile) {
  const base = bmr(profile);
  const tdee = base * (ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.375);
  const calories = Math.round(tdee + goalCalorieAdjustment(profile.goal));
  const protein_g = Math.round(proteinPerKg(profile.goal) * profile.weightKg);
  const fatCalories = calories * fatPctOfCalories(profile.goal);
  const fat_g = Math.round(fatCalories / 9);
  const proteinCalories = protein_g * 4;
  const carbCalories = Math.max(0, calories - proteinCalories - fatCalories);
  const carbs_g = Math.round(carbCalories / 4);
  const sugar_g = Math.round((calories * 0.10) / 4);
  const sodium_mg = 2000;
  return { calories, protein_g, carbs_g, fat_g, sugar_g, sodium_mg };
}

function validCustomTarget(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return Math.round(n);
}

function computeDailyTargets(profile) {
  const recommended = computeRecommendedDailyTargets(profile);
  if (profile.targetMode !== "custom") return recommended;
  const custom = profile.customTargets || {};
  return {
    ...recommended,
    calories: validCustomTarget(custom.calories, recommended.calories, 800, 6000),
    protein_g: validCustomTarget(custom.protein_g, recommended.protein_g, 10, 400),
    sugar_g: validCustomTarget(custom.sugar_g, recommended.sugar_g, 5, 250),
    sodium_mg: validCustomTarget(custom.sodium_mg, recommended.sodium_mg, 200, 10000),
  };
}

// Kept only because the original curated template still calls this helper.
// It now returns full daily targets; the visible "For You" panel is replaced
// before rendering and never describes these values as "remaining".
function computeRemainingToday(targets) {
  return { ...targets };
}

function allergenHits(product, profile) {
  const flagged = new Set(profile.allergies || []);
  return (product.allergens || []).filter((a) => flagged.has(a));
}

function mayContainAllergenHits(product, profile) {
  const flagged = new Set(profile.allergies || []);
  return (product.mayContainAllergens || []).filter((a) => flagged.has(a));
}
