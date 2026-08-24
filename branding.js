// User-facing brand normalization. Keeps "Scan" where it describes the action,
// but replaces the old product brand shown in the app header.

function applyFoodTruthBranding() {
  document.title = "Food Truth Scanner";
  document.querySelectorAll(".logo-text").forEach((el) => {
    if (el.textContent.trim().toLowerCase() === "scan") {
      el.textContent = "Food Truth Scanner";
    }
  });
}

applyFoodTruthBranding();

const foodTruthBrandObserver = new MutationObserver(() => applyFoodTruthBranding());
const foodTruthAppRoot = document.getElementById("app");
if (foodTruthAppRoot) {
  foodTruthBrandObserver.observe(foodTruthAppRoot, { childList: true, subtree: true });
}
