/**
 * Food Truth Scanner — application composition root.
 *
 * Core domain modules load first. Feature modules only define installers.
 * This file is the single place where browser behavior is composed, making
 * initialization order explicit and preventing hidden self-executing patches.
 */

function bootstrapFoodTruthScanner() {
  installMethodology();
  installOpenFoodFactsUI();
  installPersonalization();
  installNutrientUI();
  installScanner();
  installBranding();
  render();
}

bootstrapFoodTruthScanner();
