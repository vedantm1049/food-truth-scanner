/**
 * Scan — subscriber profile & daily target calculator
 *
 * Computes real daily calorie/macro targets from the profile fields
 * already collected at onboarding, rather than using a static made-up
 * number. Method: Mifflin-St Jeor BMR -> activity multiplier -> goal
 * adjustment -> protein scaled to bodyweight and goal, fat as a % of
 * calories, carbs as the remainder. Sugar/sodium ceilings follow standard
 * WHO/AHA daily guidance. See the spec (§7.2) for the full rationale.
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
    case "lose_weight":
      return -500;
    case "gain_weight":
      return 500;
    case "build_muscle":
      return 250;
    default: // eat_healthy, maintain_weight
      return 0;
  }
}

function proteinPerKg(goal) {
  switch (goal) {
    case "lose_weight":
      return 2.0; // higher protein to protect lean mass in a deficit
    case "build_muscle":
      return 2.2;
    case "gain_weight":
      return 1.8;
    default:
      return 1.6;
  }
}

function fatPctOfCalories(goal) {
  return goal === "gain_weight" ? 0.3 : 0.25;
}

/**
 * Computes daily targets from a profile object:
 * { gender, age, heightCm, weightKg, targetWeightKg, goal, activityLevel }
 */
function computeDailyTargets(profile) {
  const b = bmr(profile);
  const tdee = b * (ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.375);
  const calories = Math.round(tdee + goalCalorieAdjustment(profile.goal));

  const protein_g = Math.round(proteinPerKg(profile.goal) * profile.weightKg);
  const fatCalories = calories * fatPctOfCalories(profile.goal);
  const fat_g = Math.round(fatCalories / 9);
  const proteinCalories = protein_g * 4;
  const carbCalories = Math.max(0, calories - proteinCalories - fatCalories);
  const carbs_g = Math.round(carbCalories / 4);

  // WHO guidance: free sugar <= 10% of calories (4 kcal/g). AHA sodium ceiling: 2000mg/day.
  const sugar_g = Math.round((calories * 0.10) / 4);
  const sodium_mg = 2000;

  return { calories, protein_g, carbs_g, fat_g, sugar_g, sodium_mg };
}

/**
 * "Remaining today" — in production this is (targets - consumed so far,
 * pulled from logged meals). In the prototype it's a simulated, editable
 * fraction standing in for that live data: defaults to "a bit past midday,
 * some of the day's budget already used."
 */
function computeRemainingToday(targets, consumedFraction) {
  const remaining = {};
  for (const key of Object.keys(targets)) {
    remaining[key] = Math.max(0, Math.round(targets[key] * (1 - consumedFraction)));
  }
  return remaining;
}

/**
 * Returns the list of DIRECT allergen keys (subset of ALL_ALLERGENS) that a
 * product shares with the user's flagged allergies — empty if safe. Kept
 * separate from "may contain" cross-contact matches (below) because the two
 * carry different risk levels and should read differently on screen.
 */
function allergenHits(product, profile) {
  const flagged = new Set(profile.allergies || []);
  return (product.allergens || []).filter((a) => flagged.has(a));
}

/**
 * Returns allergen keys the user has flagged that only appear on a
 * product's "may contain traces of" cross-contact warning, not as an
 * actual ingredient. Real, distinct category on food labels — not the
 * same risk level as allergenHits() above, and shouldn't be worded the
 * same way in the UI.
 */
function mayContainAllergenHits(product, profile) {
  const flagged = new Set(profile.allergies || []);
  return (product.mayContainAllergens || []).filter((a) => flagged.has(a));
}
