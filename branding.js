/** Food Truth Scanner — brand normalization feature. */

function applyFoodTruthBranding() {
  document.title = "Food Truth Scanner";
  document.querySelectorAll(".logo-text").forEach((el) => {
    if (el.textContent.trim().toLowerCase() === "scan") el.textContent = "Food Truth Scanner";
  });
}

function installBranding() {
  applyFoodTruthBranding();
  const root = document.getElementById("app");
  if (!root) return;
  const observer = new MutationObserver(applyFoodTruthBranding);
  observer.observe(root, { childList: true, subtree: true });
}
