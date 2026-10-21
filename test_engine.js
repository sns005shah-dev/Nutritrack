// NutriTrack AI Engine Test Suite
const assert = require('assert');

// 1. Mifflin-St Jeor Energy Engine
function calculateBMR(weightKg, heightCm, age, sex) {
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

function calculateTDEE(bmr, activityLevel) {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
}

function calculateTargets(profile) {
  const bmr = calculateBMR(profile.weightKg, profile.heightCm, profile.age, profile.sex);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  let calories = tdee;
  let proteinGrams = 0;
  let warnings = [];

  if (profile.goal === 'muscle_gain') {
    calories = tdee + 300; // Moderate surplus
    proteinGrams = Math.round(profile.weightKg * 2.0); // 2.0g/kg
  } else if (profile.goal === 'fat_loss') {
    calories = tdee - 400; // Moderate deficit
    proteinGrams = Math.round(profile.weightKg * 2.2); // High protein to preserve LBM
  } else {
    calories = tdee;
    proteinGrams = Math.round(profile.weightKg * 1.6);
  }

  // Safety checks
  const minCalories = profile.sex === 'male' ? 1500 : 1200;
  if (calories < minCalories) {
    warnings.push(`Target adjusted: Calories were below safe minimum of ${minCalories} kcal/day.`);
    calories = minCalories;
  }

  // Fat target: ~25% of calories
  const fatCalories = calories * 0.25;
  const fatGrams = Math.round(fatCalories / 9);

  // Carb target: remainder
  const carbCalories = Math.max(0, calories - (proteinGrams * 4 + fatGrams * 9));
  const carbGrams = Math.round(carbCalories / 4);

  // Fiber: 14g per 1000 kcal
  const fiberGrams = Math.round((calories / 1000) * 14);

  // Water: 35ml per kg
  const waterMl = Math.round(profile.weightKg * 35);

  return { bmr, tdee, calories, proteinGrams, fatGrams, carbGrams, fiberGrams, waterMl, warnings };
}

// 2. Nutrition Scaling & Units
function calculateFoodNutrients(food, quantity, unit) {
  let grams = 0;
  if (unit === 'g') {
    grams = quantity;
  } else if (unit === 'ml') {
    grams = quantity; // density approx 1
  } else if (food.servingUnits && food.servingUnits[unit]) {
    grams = food.servingUnits[unit] * quantity;
  } else {
    grams = (food.defaultServingGrams || 100) * quantity;
  }

  const factor = grams / 100;
  const res = {
    grams: Math.round(grams * 10) / 10,
    calories: Math.round((food.calories || 0) * factor),
    protein: Math.round((food.protein || 0) * factor * 10) / 10,
    carbs: Math.round((food.carbs || 0) * factor * 10) / 10,
    fat: Math.round((food.fat || 0) * factor * 10) / 10,
    fiber: Math.round((food.fiber || 0) * factor * 10) / 10,
    sugar: food.sugar !== undefined ? Math.round(food.sugar * factor * 10) / 10 : null,
    sodium: food.sodium !== undefined ? Math.round(food.sodium * factor) : null,
    potassium: food.potassium !== undefined ? Math.round(food.potassium * factor) : null,
    calcium: food.calcium !== undefined ? Math.round(food.calcium * factor) : null,
    iron: food.iron !== undefined ? Math.round(food.iron * factor * 10) / 10 : null,
  };
  return res;
}

// 3. Daily & Meal Totals Aggregation
function calculateTotals(entries) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    potassium: 0,
    calcium: 0,
    iron: 0
  };

  entries.forEach(e => {
    totals.calories += e.calories || 0;
    totals.protein += e.protein || 0;
    totals.carbs += e.carbs || 0;
    totals.fat += e.fat || 0;
    totals.fiber += e.fiber || 0;
    totals.sugar += e.sugar || 0;
    totals.sodium += e.sodium || 0;
    totals.potassium += e.potassium || 0;
    totals.calcium += e.calcium || 0;
    totals.iron += e.iron || 0;
  });

  for (let k in totals) {
    totals[k] = Math.round(totals[k] * 10) / 10;
  }
  return totals;
}

// 4. Natural Language Parser
function parseNaturalLanguageMeal(text) {
  const wordsToNumbers = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'half': 0.5, 'a': 1, 'an': 1, 'single': 1, 'double': 2
  };
  
  // Clean prefixes like "i ate", "i had", "estimate...", etc.
  let cleaned = text.toLowerCase()
    .replace(/^.*?(?:i ate|i had|i drank|consumed|estimate(?: the calories and protein in)?)\s+/i, '')
    .replace(/,/g, ' and ')
    .replace(/\s+/g, ' ');

  const parts = cleaned.split(/\band\b|\bwith\b|\bplus\b/);
  const items = [];

  const foodAliases = [
    { key: 'roti', names: ['roti', 'rotis', 'chapati', 'chapatis', 'phulka'] },
    { key: 'egg', names: ['boiled egg', 'boiled eggs', 'egg', 'eggs', 'whole egg'] },
    { key: 'dal', names: ['dal', 'daal', 'yellow dal', 'moong dal', 'lentil'] },
    { key: 'milk', names: ['milk', 'cow milk', 'toned milk'] },
    { key: 'chicken', names: ['cooked chicken', 'chicken breast', 'chicken'] },
    { key: 'rice', names: ['rice', 'cooked rice', 'basmati rice', 'white rice'] },
    { key: 'salad', names: ['salad', 'green salad', 'cucumber salad'] },
    { key: 'biryani', names: ['biryani', 'chicken biryani', 'veg biryani'] },
    { key: 'banana', names: ['banana', 'bananas'] },
    { key: 'paneer', names: ['paneer', 'cottage cheese'] }
  ];

  parts.forEach(part => {
    let trimmed = part.trim().replace(/^i ate\s+|^i had\s+|^a little\s+/i, '');
    if (!trimmed) return;

    let qty = 1;
    let unit = 'serving';
    let matchedFood = null;

    const numMatch = trimmed.match(/(\d+(?:\.\d+)?|\b(?:one|two|three|four|five|half|a|an)\b)\s*(g|grams|ml|milliliters|bowl|bowls|katori|plate|plates|cup|cups|glass|glasses|rotis?|eggs?|pieces?)?/i);
    if (numMatch) {
      const rawQty = numMatch[1];
      qty = wordsToNumbers[rawQty] !== undefined ? wordsToNumbers[rawQty] : parseFloat(rawQty);
      if (numMatch[2]) {
        unit = numMatch[2].toLowerCase();
      }
    }

    for (const f of foodAliases) {
      for (const name of f.names) {
        if (trimmed.includes(name)) {
          matchedFood = f.key;
          break;
        }
      }
      if (matchedFood) break;
    }

    if (matchedFood) {
      if (['roti', 'rotis'].includes(unit) || (matchedFood === 'roti' && unit === 'serving')) unit = 'piece';
      if (['egg', 'eggs'].includes(unit) || (matchedFood === 'egg' && unit === 'serving')) unit = 'piece';
      if (['bowl', 'bowls', 'katori'].includes(unit)) unit = 'bowl';
      if (['glass', 'glasses'].includes(unit)) unit = 'glass';
      if (['plate', 'plates'].includes(unit)) unit = 'plate';
      if (['g', 'grams'].includes(unit)) unit = 'g';
      if (['ml', 'milliliters'].includes(unit)) unit = 'ml';

      items.push({ foodKey: matchedFood, quantity: qty, unit });
    }
  });

  return items;
}

// 5. Recipe Builder with Yield Factor
function calculateRecipe(ingredients, servings, cookedWeightGrams, rawTotalGrams) {
  let totalNutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  ingredients.forEach(item => {
    totalNutrients.calories += item.calories;
    totalNutrients.protein += item.protein;
    totalNutrients.carbs += item.carbs;
    totalNutrients.fat += item.fat;
    totalNutrients.fiber += item.fiber;
  });

  const yieldFactor = (cookedWeightGrams && rawTotalGrams) ? cookedWeightGrams / rawTotalGrams : 1.0;
  const perServing = {
    calories: Math.round(totalNutrients.calories / servings),
    protein: Math.round((totalNutrients.protein / servings) * 10) / 10,
    carbs: Math.round((totalNutrients.carbs / servings) * 10) / 10,
    fat: Math.round((totalNutrients.fat / servings) * 10) / 10,
    fiber: Math.round((totalNutrients.fiber / servings) * 10) / 10,
    servingWeightGrams: cookedWeightGrams ? Math.round(cookedWeightGrams / servings) : Math.round(rawTotalGrams / servings)
  };

  return { totalNutrients, perServing, yieldFactor };
}

// RUN TESTS
console.log("=== STARTING NUTRITRACK AI ENGINE TESTS ===");

// Test 1: BMR Calculation
const maleBmr = calculateBMR(75, 178, 28, 'male');
assert.strictEqual(maleBmr, 1727.5, "Male BMR should match Mifflin-St Jeor formula");
const femaleBmr = calculateBMR(60, 165, 30, 'female');
assert.strictEqual(femaleBmr, 1320.25, "Female BMR should match Mifflin-St Jeor formula");
console.log("✓ Test 1: Mifflin-St Jeor BMR formulas PASSED");

// Test 2: TDEE Multipliers
const tdeeMod = calculateTDEE(maleBmr, 'moderate');
assert.strictEqual(tdeeMod, 2678, "TDEE moderate activity calculation should match");
console.log("✓ Test 2: TDEE Multipliers PASSED");

// Test 3: Muscle Gain & Fat Loss Targets
const profileGain = { age: 28, sex: 'male', heightCm: 178, weightKg: 75, activityLevel: 'moderate', goal: 'muscle_gain' };
const targetsGain = calculateTargets(profileGain);
assert.strictEqual(targetsGain.calories, 2978, "Muscle gain should add 300 kcal surplus");
assert.strictEqual(targetsGain.proteinGrams, 150, "Muscle gain protein should be 2.0g/kg (150g for 75kg)");

const profileLoss = { age: 28, sex: 'male', heightCm: 178, weightKg: 75, activityLevel: 'moderate', goal: 'fat_loss' };
const targetsLoss = calculateTargets(profileLoss);
assert.strictEqual(targetsLoss.calories, 2278, "Fat loss should subtract 400 kcal deficit");
assert.strictEqual(targetsLoss.proteinGrams, 165, "Fat loss protein should be 2.2g/kg (165g for 75kg)");
console.log("✓ Test 3: Goal Targets (Surplus, Deficit, Protein) PASSED");

// Test 4: Calorie Floor Safety Warning
const lowProfile = { age: 40, sex: 'female', heightCm: 150, weightKg: 45, activityLevel: 'sedentary', goal: 'fat_loss' };
const lowTargets = calculateTargets(lowProfile);
assert.ok(lowTargets.calories >= 1200, "Female calories must not fall below safety floor of 1200 kcal");
assert.ok(lowTargets.warnings.length > 0, "Safety floor must generate an explicit warning");
console.log("✓ Test 4: Calorie Floor Safety Warning PASSED");

// Test 5: Food Nutrient Scaling
const testRoti = {
  name: 'Roti',
  calories: 264,
  protein: 9.0,
  carbs: 55.0,
  fat: 1.0,
  fiber: 7.0,
  servingUnits: { 'piece': 35 }
};
const threeRotis = calculateFoodNutrients(testRoti, 3, 'piece');
assert.strictEqual(threeRotis.grams, 105);
assert.strictEqual(threeRotis.calories, Math.round(264 * 1.05)); // 277
assert.strictEqual(threeRotis.protein, Math.round(9.0 * 1.05 * 10) / 10); // 9.5
console.log("✓ Test 5: Food Serving Scaling (3 rotis = 105g) PASSED");

// Test 6: Missing Nutrient Delineation
const testIncompleteFood = {
  name: 'Mystery Snack',
  calories: 150,
  protein: 5,
  carbs: 20,
  fat: 5
};
const incompleteNutrients = calculateFoodNutrients(testIncompleteFood, 100, 'g');
assert.strictEqual(incompleteNutrients.calcium, null, "Missing calcium should be null, not 0");
assert.strictEqual(incompleteNutrients.iron, null, "Missing iron should be null, not 0");
console.log("✓ Test 6: Missing Nutrient Null Delineation PASSED");

// Test 7: AI Natural Language Parser
const nlInput1 = "I ate 3 rotis, 2 boiled eggs, one bowl of dal and 250 ml milk.";
const parsed1 = parseNaturalLanguageMeal(nlInput1);
assert.strictEqual(parsed1.length, 4, "Should parse 4 distinct foods");
assert.strictEqual(parsed1[0].foodKey, 'roti');
assert.strictEqual(parsed1[0].quantity, 3);
assert.strictEqual(parsed1[0].unit, 'piece');
assert.strictEqual(parsed1[1].foodKey, 'egg');
assert.strictEqual(parsed1[1].quantity, 2);
assert.strictEqual(parsed1[1].unit, 'piece');
assert.strictEqual(parsed1[2].foodKey, 'dal');
assert.strictEqual(parsed1[2].quantity, 1);
assert.strictEqual(parsed1[2].unit, 'bowl');
assert.strictEqual(parsed1[3].foodKey, 'milk');
assert.strictEqual(parsed1[3].quantity, 250);
assert.strictEqual(parsed1[3].unit, 'ml');
console.log("✓ Test 7: Natural Language Meal Parser PASSED");

// Test 8: AI Parser with cooked chicken and rice
const nlInput2 = "I had 200 g cooked chicken, 150 g rice and a little salad.";
const parsed2 = parseNaturalLanguageMeal(nlInput2);
assert.strictEqual(parsed2.length, 3, "Should parse chicken, rice, salad");
assert.strictEqual(parsed2[0].quantity, 200);
assert.strictEqual(parsed2[0].unit, 'g');
assert.strictEqual(parsed2[1].quantity, 150);
assert.strictEqual(parsed2[1].unit, 'g');
console.log("✓ Test 8: Complex Natural Language Gram Quantities PASSED");

// Test 9: Daily & Meal Totals Aggregation
const testEntries = [
  { calories: 277, protein: 9.5, carbs: 57.8, fat: 1.1, fiber: 7.4 },
  { calories: 140, protein: 12.6, carbs: 1.1, fat: 9.5, fiber: 0 },
  { calories: 180, protein: 9.0, carbs: 24.0, fat: 4.5, fiber: 4.0 }
];
const dailyTotals = calculateTotals(testEntries);
assert.strictEqual(dailyTotals.calories, 597);
assert.strictEqual(dailyTotals.protein, 31.1);
assert.strictEqual(dailyTotals.carbs, 82.9);
assert.strictEqual(dailyTotals.fat, 15.1);
assert.strictEqual(dailyTotals.fiber, 11.4);
console.log("✓ Test 9: Daily Totals Aggregation PASSED");

// Test 10: Recipe Yield & Serving Calculations
const recipeIngredients = [
  { calories: 300, protein: 60, carbs: 0, fat: 6, fiber: 0, rawGrams: 300 },
  { calories: 400, protein: 8, carbs: 88, fat: 1, fiber: 2, rawGrams: 200 },
  { calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0, rawGrams: 14 }
];
const rawTotal = 514;
const cookedTotal = 700;
const recipe = calculateRecipe(recipeIngredients, 2, cookedTotal, rawTotal);
assert.strictEqual(recipe.totalNutrients.calories, 820);
assert.strictEqual(recipe.perServing.calories, 410);
assert.strictEqual(recipe.perServing.protein, 34);
assert.strictEqual(recipe.perServing.servingWeightGrams, 350);
console.log("✓ Test 10: Recipe Yield & Serving Calculations PASSED");

console.log("\nALL 10 ENGINE TESTS PASSED PERFECTLY! 🎯\n");

// Test 11: Date Boundaries & Timeline Filtering
function getEntriesForDate(entries, targetDateStr) {
  return entries.filter(e => e.date === targetDateStr);
}
const mockEntries = [
  { id: '1', date: '2026-10-21', calories: 250 },
  { id: '2', date: '2026-10-21', calories: 350 },
  { id: '3', date: '2026-10-20', calories: 500 }
];
const oct21 = getEntriesForDate(mockEntries, '2026-10-21');
assert.strictEqual(oct21.length, 2, "Should return 2 entries for 2026-10-21");
assert.strictEqual(calculateTotals(oct21).calories, 600, "Calories for Oct 21 must be 600");
console.log("✓ Test 11: Date Boundaries & Timeline Filtering PASSED");

// Test 12: JSON Backup Schema Validation & Restore
function validateBackupJSON(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.version || !data.exportDate) return false;
  if (!data.profile || typeof data.profile !== 'object') return false;
  if (!Array.isArray(data.diaryEntries)) return false;
  if (!Array.isArray(data.customFoods)) return false;
  return true;
}
const validBackup = {
  version: '1.0.0',
  exportDate: '2026-10-21T13:00:00Z',
  profile: { age: 28, sex: 'male' },
  diaryEntries: [{ id: 'e1', foodName: 'Roti' }],
  customFoods: []
};
const invalidBackup = { version: '1.0.0' }; // missing profile, diaryEntries
assert.strictEqual(validateBackupJSON(validBackup), true, "Valid backup JSON should pass validation");
assert.strictEqual(validateBackupJSON(invalidBackup), false, "Invalid backup JSON should fail validation");
console.log("✓ Test 12: JSON Backup Schema Validation PASSED");

// Test 13: CSV Export Generation
function generateDiaryCSV(entries) {
  const headers = ['Date', 'Meal', 'Food Name', 'Serving', 'Unit', 'Grams', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)'];
  const rows = entries.map(e => [
    e.date,
    e.mealType,
    `"${(e.foodName || '').replace(/"/g, '""')}"`,
    e.servingAmount,
    e.servingUnit,
    e.grams,
    e.calories,
    e.protein,
    e.carbs,
    e.fat,
    e.fiber
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
const testCSVEntries = [
  { date: '2026-10-21', mealType: 'breakfast', foodName: 'Whole Wheat Roti', servingAmount: 2, servingUnit: 'piece', grams: 70, calories: 185, protein: 6.3, carbs: 38.5, fat: 0.7, fiber: 4.9 }
];
const csvResult = generateDiaryCSV(testCSVEntries);
assert.ok(csvResult.includes('Date,Meal,Food Name'), "CSV must contain proper header row");
assert.ok(csvResult.includes('2026-10-21,breakfast,"Whole Wheat Roti",2,piece,70,185,6.3,38.5,0.7,4.9'), "CSV data row must match");
console.log("✓ Test 13: CSV Export Generation PASSED");

// Test 14: Follow-up Clarification Identification
function identifyFollowUpClarifications(parsedItems) {
  const clarifications = [];
  parsedItems.forEach(item => {
    if (item.foodKey === 'rice' && item.unit !== 'g') {
      clarifications.push({
        foodKey: item.foodKey,
        question: `For the rice, did you measure cooked rice (approx 130 kcal/100g) or raw dry rice (approx 360 kcal/100g)?`,
        options: ['Cooked basmati rice', 'Raw dry rice']
      });
    }
    if (item.foodKey === 'dal' && item.unit === 'bowl') {
      clarifications.push({
        foodKey: item.foodKey,
        question: `How was the dal prepared? (Standard home-style with 1 tsp ghee/oil tadka has ~150 kcal per katori)`,
        options: ['Standard home-cooked with tadka', 'Light / No tadka', 'Restaurant / Rich tadka']
      });
    }
  });
  return clarifications;
}
const clarificationItems = [{ foodKey: 'dal', quantity: 1, unit: 'bowl' }, { foodKey: 'rice', quantity: 1, unit: 'cup' }];
const questions = identifyFollowUpClarifications(clarificationItems);
assert.strictEqual(questions.length, 2, "Should identify 2 follow-up clarification questions");
console.log("✓ Test 14: Follow-up Clarification Questions PASSED");

// Test 15: Grounded AI Assistant Context Verification
function buildAIAssistantContext(profile, todayEntries, targets) {
  const totals = calculateTotals(todayEntries);
  const remainingCals = targets.calories - totals.calories;
  const remainingProtein = Math.round((targets.proteinGrams - totals.protein) * 10) / 10;
  return {
    todayTotals: totals,
    remainingCalories: remainingCals,
    remainingProtein: remainingProtein,
    mealsLogged: todayEntries.length,
    calorieGoal: targets.calories,
    proteinGoal: targets.proteinGrams
  };
}
const ctx = buildAIAssistantContext(profileGain, oct21, targetsGain);
assert.strictEqual(ctx.todayTotals.calories, 600);
assert.strictEqual(ctx.remainingCalories, 2978 - 600);
assert.strictEqual(ctx.calorieGoal, 2978);
console.log("✓ Test 15: Grounded AI Assistant Context Verification PASSED");

// Test 16: PWA Manifest & iOS Meta Standards
function validatePWAManifest(manifest) {
  assert.ok(manifest.name, "Manifest must have name");
  assert.ok(manifest.short_name, "Manifest must have short_name");
  assert.strictEqual(manifest.display, "standalone", "Display must be standalone for iOS PWA");
  assert.ok(manifest.icons && manifest.icons.length > 0, "Manifest must have icons");
  assert.ok(manifest.start_url, "Manifest must have start_url");
  return true;
}
const testManifest = {
  name: "NutriTrack AI",
  short_name: "NutriTrack",
  start_url: "./index.html",
  display: "standalone",
  theme_color: "#10b981",
  background_color: "#0f172a",
  icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }]
};
assert.strictEqual(validatePWAManifest(testManifest), true);
console.log("✓ Test 16: PWA Manifest & iOS Standards PASSED");

console.log("\nALL 16 VERIFICATION & QUALITY ASSURANCE TESTS PASSED! 🌟\n");
