/* Scan — prototype app shell (vanilla JS, no build step) */

/* ---------------- Icons ---------------- */
const ICONS = {
  meals: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15a9 9 0 0 1 18 0"/><path d="M3 15h18"/><path d="M12 3v2"/></svg>`,
  market: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z"/><path d="M9 13a3 3 0 0 0 6 0"/></svg>`,
  cafe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a3 3 0 0 1 0 6h-1"/><path d="M4 8h14v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"/><path d="M6 2v3"/><path d="M10 2v3"/><path d="M14 2v3"/></svg>`,
  support: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2z"/><path d="M3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z"/></svg>`,
  account: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"/></svg>`,
  scan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  headphones: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2z"/><path d="M3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z"/></svg>`,
  chevronR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
};

const CATEGORY_EMOJI = {
  snacks: "🍪",
  beverages: "🥤",
  other_dairy_products: "🥛",
  longer_life_bakery: "🥐",
  fresh_bakery: "🍞",
  breakfast: "🥣",
  eggs: "🥚",
  milk_milk_alternatives: "🥛",
  water_ice: "💧",
};

const CATEGORY_LABELS = {
  snacks: "Snacks",
  beverages: "Beverages",
  other_dairy_products: "Dairy",
  longer_life_bakery: "Bakery",
  fresh_bakery: "Fresh Bakery",
  breakfast: "Breakfast",
  eggs: "Eggs",
  milk_milk_alternatives: "Milk",
  water_ice: "Water",
};

/* ---------------- State ---------------- */
const state = {
  tab: "meals",
  overlay: null, // {type:'result', id} | {type:'scan'} | {type:'browse'} | {type:'methodology'} | {type:'editProfile'} | {type:'notFound', code} | {type:'cart'}
  marketFilter: "all",
  marketSort: "score-desc", // "score-desc" | "score-asc" — Market has no "default order" option
  browseSort: "default", // "default" | "score-desc" | "score-asc"
  profile: JSON.parse(JSON.stringify(DEFAULT_PROFILE)),
  editDraft: null,
  scanActive: false,
  manualEntryOpen: false,
  cart: {}, // { [productId]: qty }
  ingredientsExpanded: false,
};

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}
function getProductByBarcode(code) {
  return PRODUCTS.find((p) => p.barcode === String(code).trim());
}

/* ---------------- Cart helpers ----------------
 * Prices are Claude's own illustrative AED estimates (Vedant asked for a
 * reasonable placeholder), not real Market pricing — flagged in the UI.
 * Cart lives only in the in-memory `state` object; no browser storage. */
function cartCount() {
  return Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);
}
function cartTotal() {
  return Object.entries(state.cart).reduce((sum, [id, qty]) => {
    const p = getProduct(id);
    return sum + (p ? p.priceAED * qty : 0);
  }, 0);
}
function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  render();
}
function changeCartQty(id, delta) {
  const next = (state.cart[id] || 0) + delta;
  if (next <= 0) delete state.cart[id];
  else state.cart[id] = next;
  render();
}
function removeFromCart(id) {
  delete state.cart[id];
  render();
}
function openCart() {
  state.overlay = { type: "cart" };
  state._checkoutNote = false;
  render();
}
function toggleCheckoutNote() {
  state._checkoutNote = !state._checkoutNote;
  render();
}

/* ---------------- Rendering helpers ---------------- */
function thumbHTML(product, extraClass) {
  const emoji = CATEGORY_EMOJI[product.category] || "🛒";
  return `<div class="${extraClass || "thumb"}" style="position:relative;">
    <span class="emoji-fallback" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${emoji}</span>
    <img src="${product.image}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"
      onerror="this.style.display='none'"
      onload="this.previousElementSibling.style.display='none'" />
  </div>`;
}

function scoreBadgeStyle(tier) {
  return `background:${tier.bg};color:${tier.color};`;
}

// Sorts a product list by score — "default" leaves catalogue order
// untouched (the order products were researched/added in); "score-desc"/
// "score-asc" re-rank by the live computed score, so a data or scoring-
// engine change (see scoring.js) is always reflected, never a stale
// pre-sorted list. Used by both the Market grid (per active category
// filter) and the Browse overlay (full 31-SKU catalogue).
function sortProductsByScore(products, sortMode) {
  if (sortMode !== "score-desc" && sortMode !== "score-asc") return products;
  const withScores = products.map((p) => ({ p, score: computeCaloScore(p).score }));
  withScores.sort((a, b) => (sortMode === "score-desc" ? b.score - a.score : a.score - b.score));
  return withScores.map((x) => x.p);
}

// includeDefaultOption: Market dropped the catalogue-order option (its
// default is now "high to low" itself, see state.marketSort); Browse
// still offers it.
function renderSortRow(currentSort, onChangeFnName, includeDefaultOption) {
  return `<div class="sort-row">
    <label for="${onChangeFnName}-select">Sort</label>
    <select id="${onChangeFnName}-select" class="sort-select" onchange="${onChangeFnName}(this.value)">
      ${includeDefaultOption ? `<option value="default" ${currentSort === "default" ? "selected" : ""}>Default order</option>` : ""}
      <option value="score-desc" ${currentSort === "score-desc" ? "selected" : ""}>Score: High to Low</option>
      <option value="score-asc" ${currentSort === "score-asc" ? "selected" : ""}>Score: Low to High</option>
    </select>
  </div>`;
}

// The Protein Chocolate Drink is pinned to the second grid tile —
// first row, right side — whenever Market is sorted high to low. A
// deliberate merchandising call for the demo (Vedant, 2026-08-19), not a
// scoring artifact — applies within whatever category filter is active,
// wherever this product would otherwise land.
const MARKET_PINNED_FIRST_ROW_ID = "calo-protein-chocolate-200ml";
function applyMarketPin(sortedProducts, sortMode) {
  if (sortMode !== "score-desc") return sortedProducts;
  const idx = sortedProducts.findIndex((p) => p.id === MARKET_PINNED_FIRST_ROW_ID);
  if (idx === -1) return sortedProducts;
  const arr = sortedProducts.slice();
  const [pinned] = arr.splice(idx, 1);
  arr.splice(1, 0, pinned);
  return arr;
}

function renderTopbar(title) {
  const count = cartCount();
  return `<div class="app-topbar">
    <span class="logo-text">Scan</span>
    ${title ? `<span class="topbar-title">${title}</span>` : `<span style="flex:1;"></span>`}
    <div class="topbar-actions">
      <span class="icon-btn" onclick="openSupportSheet()" aria-label="Support">${ICONS.headphones}</span>
      <span class="icon-btn" onclick="openCart()" aria-label="Cart">
        ${ICONS.cart}
        ${count ? `<span class="cart-badge">${count}</span>` : ""}
      </span>
    </div>
  </div>`;
}

function renderBottomNav() {
  const tabs = [
    { key: "meals", label: "Meals", icon: ICONS.meals },
    { key: "market", label: "Market", icon: ICONS.market },
    { key: "cafe", label: "Cafe", icon: ICONS.cafe },
    { key: "scan", label: "Scan", icon: ICONS.scan },
    { key: "account", label: "Account", icon: ICONS.account },
  ];
  return `<div class="bottom-nav-wrap">
    <div class="bottom-nav">
      ${tabs
        .map((t) =>
          t.key === "scan"
            ? `<div class="nav-item" onclick="openScan()">
                ${t.icon}<span>${t.label}</span>
              </div>`
            : `<div class="nav-item ${state.tab === t.key ? "active" : ""}" onclick="openTab('${t.key}')">
                ${t.icon}<span>${t.label}</span>
              </div>`
        )
        .join("")}
    </div>
  </div>`;
}

/* ---------------- Meals tab ---------------- */
function renderMeals() {
  return `<div class="screen">
  ${renderTopbar()}
  <div class="app-content">
    <h1 class="page-title">Good afternoon, ${state.profile.name}</h1>
    <p class="page-sub">Here's what's on your plate today.</p>

    <div class="promo-card" onclick="openScan()">
      <div class="eyebrow">New · Scan</div>
      <h2>Know what's really in it</h2>
      <p>Scan any barcode — in the Market or anywhere else — for an honest health score matched to your goals.</p>
      <div class="promo-cta">${ICONS.scan}<span>Scan a product</span></div>
    </div>

    <div class="section-label">Today's Plan</div>
    <div class="card" style="padding:16px; display:flex; gap:12px; align-items:center; margin-bottom:10px;">
      <div style="width:52px;height:52px;border-radius:14px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;font-size:26px;">🍗</div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:14px;">Grilled Chicken & Quinoa Bowl</div>
        <div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">Lunch · 520 kcal · 42g protein</div>
      </div>
    </div>
    <div class="card" style="padding:16px; display:flex; gap:12px; align-items:center;">
      <div style="width:52px;height:52px;border-radius:14px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;font-size:26px;">🥗</div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:14px;">Mediterranean Salmon Salad</div>
        <div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">Dinner · 480 kcal · 38g protein</div>
      </div>
    </div>
  </div>
  ${renderBottomNav()}
  </div>`;
}

/* ---------------- Market tab ---------------- */
// Market only lists what's actually sold here. Non-Market SKUs (e.g. Pringles
// in the pilot) exist purely as scan/browse targets — reachable via Scan,
// manual entry, or the Browse overlay, never via this grid.
function renderMarket() {
  const marketProducts = PRODUCTS.filter((p) => p.isCaloMarket);
  const cats = ["all", ...new Set(marketProducts.map((p) => p.category))];
  const filteredByCategory = state.marketFilter === "all" ? marketProducts : marketProducts.filter((p) => p.category === state.marketFilter);
  // Sort applies on top of whichever category chip is active — "All"
  // sorts the full Market catalogue, any other chip sorts just that
  // category, so one control covers both cases the same way. Defaults to
  // high-to-low (no "catalogue order" option here, unlike Browse).
  const sorted = sortProductsByScore(filteredByCategory, state.marketSort);
  const filtered = applyMarketPin(sorted, state.marketSort);

  return `<div class="screen">
  ${renderTopbar("Market")}
  <div class="app-content">
    <div class="market-toolbar" style="margin-top:14px;">
      ${cats
        .map(
          (c) => `<div class="chip ${state.marketFilter === c ? "active" : ""}" onclick="setMarketFilter('${c}')">${c === "all" ? "All" : CATEGORY_LABELS[c] || c}</div>`
        )
        .join("")}
    </div>
    ${renderSortRow(state.marketSort, "setMarketSort", false)}
    <div class="product-grid">
      ${filtered.map((p) => renderProductCard(p)).join("")}
    </div>
    <div style="height:8px;"></div>
  </div>
  ${renderBottomNav()}
  </div>`;
}

function renderProductCard(p) {
  const result = computeCaloScore(p);
  const tier = tierForScore(result.score);
  const hits = allergenHits(p, state.profile);
  const qty = state.cart[p.id] || 0;
  return `<div class="product-card" onclick="openProduct('${p.id}')">
    ${thumbHTML(p)}
    <div class="score-badge" style="${scoreBadgeStyle(tier)}">${result.score}</div>
    <div class="info">
      <div class="brand">${p.brand}</div>
      <div class="name">${p.name}</div>
      <div class="tier-label" style="color:${tier.color};">${tier.label}</div>
      ${
        p.isCaloMarket
          ? `<div class="card-cart-row">
              <span class="price-tag">AED ${p.priceAED.toFixed(2)}</span>
              ${
                qty
                  ? `<div class="qty-stepper" onclick="event.stopPropagation()">
                      <span class="qty-btn" onclick="changeCartQty('${p.id}', -1)">${ICONS.minus}</span>
                      <span class="qty-num">${qty}</span>
                      <span class="qty-btn" onclick="changeCartQty('${p.id}', 1)">${ICONS.plus}</span>
                    </div>`
                  : `<span class="add-cart-btn" onclick="event.stopPropagation(); addToCart('${p.id}')">${ICONS.plus}</span>`
              }
            </div>`
          : `<div class="card-cart-row"><span class="not-market-note">Not sold in the Market</span></div>`
      }
    </div>
    ${hits.length ? `<div class="allergen-ribbon">${ICONS.alert}<span>Contains ${hits.map((a) => ALLERGEN_LABELS[a]).join(", ")}</span></div>` : ""}
  </div>`;
}

/* ---------------- Cafe / Support (stubs) ---------------- */
function renderCafe() {
  return `<div class="screen">${renderTopbar("Cafe")}
  <div class="app-content">
    <div class="empty-state">
      <div class="emoji">☕</div>
      <h3>Cafe</h3>
      <p>Not part of this prototype — included so the nav reads as the real app.</p>
    </div>
  </div>${renderBottomNav()}
  </div>`;
}
function renderSupportSheet() {
  return `<div class="sheet-overlay" onclick="if(event.target===this) closeSheet()">
    <div class="sheet">
      <h3>Support</h3>
      <p>Not part of this prototype — included so the top bar reads as the real app. In production this opens the app's live chat and help center.</p>
      <div class="btn-secondary" style="margin-top:16px;" onclick="closeSheet()">Close</div>
    </div>
  </div>`;
}

/* ---------------- Account tab ---------------- */
function renderAccount() {
  const targets = computeDailyTargets(state.profile);
  const initials = state.profile.name.slice(0, 1).toUpperCase();
  return `<div class="screen">${renderTopbar("Account")}
  <div class="app-content">
    <div class="profile-header" style="margin-top:12px;">
      <div class="avatar-circle">${initials}</div>
      <div>
        <div style="font-weight:800;font-size:17px;">${state.profile.name}</div>
        <div style="font-size:12.5px;color:var(--ink-muted);">${GOAL_LABELS[state.profile.goal]} · ${ACTIVITY_LABELS[state.profile.activityLevel]}</div>
      </div>
    </div>

    <div class="section-label">My Daily Targets — computed, not fixed</div>
    <div class="target-grid">
      <div class="target-tile"><div class="val">${targets.calories}</div><div class="lbl">Calories / day</div></div>
      <div class="target-tile"><div class="val">${targets.protein_g}g</div><div class="lbl">Protein</div></div>
      <div class="target-tile"><div class="val">${targets.carbs_g}g</div><div class="lbl">Carbs</div></div>
      <div class="target-tile"><div class="val">${targets.fat_g}g</div><div class="lbl">Fat</div></div>
    </div>
    <p style="font-size:11.5px;color:var(--ink-faint);margin:8px 2px 0;line-height:1.4;">Computed from your gender, age, height, weight, goal and activity level — see "How we calculate this" on any scan result.</p>

    <div class="section-label">Profile</div>
    <div class="list-row" onclick="openEditProfile()">
      <div class="l">Edit profile & goals</div>
      <div class="r">${ICONS.chevronR}</div>
    </div>
    <div class="list-row" onclick="openEditProfile()">
      <div class="l">Food allergies</div>
      <div class="r">${state.profile.allergies.length ? state.profile.allergies.map((a) => ALLERGEN_LABELS[a]).join(", ") : "None set"}</div>
    </div>
  </div>${renderBottomNav()}
  </div>`;
}

/* ---------------- Result overlay ---------------- */
function macroBarColor(pct) {
  if (pct >= 85) return "#c1462e";
  if (pct >= 50) return "#c68a2e";
  return "#1e9d65";
}

function renderMacroBar(label, productVal, remainingVal, unit) {
  const pct = remainingVal > 0 ? Math.round((productVal / remainingVal) * 100) : 100;
  const displayPct = Math.min(100, pct);
  const overflow = pct > 100;
  return `<div class="macro-bar-row">
    <div class="macro-bar-label">
      <span>${label}</span>
      <span class="amt">${productVal}${unit} of ${remainingVal}${unit} left${overflow ? " · over" : ""}</span>
    </div>
    <div class="macro-bar-track"><div class="macro-bar-fill" style="width:${displayPct}%;background:${macroBarColor(pct)};"></div></div>
  </div>`;
}

function nutrientDescription(key, product) {
  const v = product.nutrition[key];
  switch (key) {
    case "sugar_g":
      return `${v}g per serving`;
    case "satFat_g":
      return `${v}g per serving`;
    case "sodium_mg":
      return `${v}mg per serving`;
    case "fiber_g":
      return `${v}g per serving`;
    case "protein_g":
      return `${v}g per serving`;
  }
}

const NUTRIENT_META = {
  sugar_g: { label: "Sugar" },
  satFat_g: { label: "Saturated Fat" },
  sodium_mg: { label: "Sodium" },
  fiber_g: { label: "Fiber" },
  protein_g: { label: "Protein" },
};
const LIGHT_COLOR = { good: "#1e9d65", medium: "#c68a2e", high: "#c1462e" };

function ingredientRowHTML(ing) {
  if (!ing.flag) {
    return `<div class="ingredient-row"><div class="ingredient-name">${ing.name}</div></div>`;
  }
  const cls = ing.flag === "concern" ? "concern" : "caution";
  const label = ing.flag === "concern" ? "Flagged" : "Caution";
  return `<div class="ingredient-row ingredient-row-${cls}">
    <div class="ingredient-head">
      <span class="ingredient-name">${ing.name}</span>
      <span class="ingredient-flag ingredient-flag-${cls}">${label}</span>
    </div>
    <div class="ingredient-reason">${ing.reason}</div>
  </div>`;
}

// Ingredients panel: collapsed to a one-line summary by default — full
// per-ingredient detail (what most people don't need unless something
// stands out) sits one tap away, not pre-expanded.
function renderIngredientsPanel(p) {
  if (!p.ingredients || !p.ingredients.length) return "";
  const flagged = p.ingredients.filter((i) => i.flag === "concern");
  const caution = p.ingredients.filter((i) => i.flag === "caution");
  const total = p.ingredients.length;
  const expanded = state.ingredientsExpanded;

  const countLine = flagged.length || caution.length
    ? `${total} ingredients — ${[
        flagged.length ? `${flagged.length} flagged` : null,
        caution.length ? `${caution.length} caution` : null,
      ]
        .filter(Boolean)
        .join(", ")}`
    : `${total} ingredients — nothing flagged`;

  // Named preview of the highest-severity items, so the collapsed summary
  // still surfaces the one thing worth knowing without a tap.
  const preview = [...flagged, ...caution].slice(0, 2).map((i) => i.name).join(", ");
  const previewSuffix = preview ? ` — includes ${preview}${flagged.length + caution.length > 2 ? ", …" : ""}` : "";

  return `<div class="panel">
    <div class="panel-title">Ingredients</div>
    <div class="panel-sub">${countLine}${expanded ? "" : previewSuffix}${p.dataConfidence === "medium" ? " · sourced from the manufacturer's published label, confidence: medium" : ""}</div>
    ${expanded ? p.ingredients.map(ingredientRowHTML).join("") : ""}
    <div class="ingredients-toggle" onclick="toggleIngredients()">${expanded ? "Hide details" : "View ingredient details"}</div>
  </div>`;
}

function renderResultOverlay(id) {
  const p = getProduct(id);
  const result = computeCaloScore(p);
  const tier = tierForScore(result.score);
  const hits = allergenHits(p, state.profile);
  const mayHits = mayContainAllergenHits(p, state.profile);
  const targets = computeDailyTargets(state.profile);
  const remaining = computeRemainingToday(targets, state.profile.consumedFraction);
  const circumference = 2 * Math.PI * 36;
  const dash = (result.score / 100) * circumference;
  const swap = p.swapId ? getProduct(p.swapId) : null;
  const qty = state.cart[p.id] || 0;

  return `<div class="overlay">
    <div class="overlay-header">
      <div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div>
    </div>
    <div class="overlay-body">

      ${
        hits.length
          ? `<div class="allergen-banner">
              ${ICONS.alert}
              <div>
                <div class="title">Contains ${hits.map((a) => ALLERGEN_LABELS[a]).join(", ")}</div>
                <div class="sub">You've flagged this allergen in your profile. We still show the score below, in case you're scanning this for someone else.</div>
              </div>
            </div>`
          : ""
      }
      ${
        !hits.length && mayHits.length
          ? `<div class="allergen-banner allergen-banner-caution">
              ${ICONS.alert}
              <div>
                <div class="title">May contain traces of ${mayHits.map((a) => ALLERGEN_LABELS[a]).join(", ")}</div>
                <div class="sub">This is a cross-contact warning on the label, not a listed ingredient — lower risk than "Contains", but it matches your profile so we're flagging it. The score below is shown as normal.</div>
              </div>
            </div>`
          : ""
      }

      <div class="result-product-head">
        ${thumbHTML(p, "thumb-lg")}
        <div>
          <div class="brand">${p.brand}</div>
          <div class="name">${p.name}</div>
          <div class="meta">${p.servingLabel}${p.isCaloMarket ? " · Sold in the Market" : ""}</div>
        </div>
      </div>

      <div class="score-ring-row" style="background:${tier.bg};">
        <div class="score-ring">
          <svg width="84" height="84">
            <circle cx="42" cy="42" r="36" stroke="#ffffffaa" stroke-width="8" fill="none"/>
            <circle cx="42" cy="42" r="36" stroke="${tier.color}" stroke-width="8" fill="none"
              stroke-dasharray="${dash} ${circumference}" stroke-linecap="round"/>
          </svg>
          <div class="score-num" style="color:${tier.color};">${result.score}</div>
        </div>
        <div style="flex:1;">
          <div class="tier-name" style="color:${tier.color};">${tier.label}</div>
          <div class="verdict" style="color:${tier.color};">${p.verdict}</div>
        </div>
        <div class="score-info-btn" style="color:${tier.color};" onclick="openMethodology()" aria-label="How we calculate this score">${ICONS.info}</div>
      </div>

      ${
        p.isCaloMarket
          ? `<div class="result-cart-row">
              <div class="price-tag price-tag-lg">AED ${p.priceAED.toFixed(2)}</div>
              ${
                qty
                  ? `<div class="qty-stepper qty-stepper-lg">
                      <span class="qty-btn" onclick="changeCartQty('${p.id}', -1)">${ICONS.minus}</span>
                      <span class="qty-num">${qty}</span>
                      <span class="qty-btn" onclick="changeCartQty('${p.id}', 1)">${ICONS.plus}</span>
                    </div>`
                  : `<div class="btn-primary btn-add-cart" onclick="addToCart('${p.id}')">${ICONS.cart}<span>Add to Cart</span></div>`
              }
            </div>`
          : ""
      }

      <div class="panel">
        <div class="panel-title">Fits Your Day</div>
        <div class="panel-sub">Based on your computed daily targets and roughly where you are in the day — not a generic recommendation.</div>
        ${renderMacroBar("Calories", p.nutrition.calories, remaining.calories, "")}
        ${renderMacroBar("Sugar", p.nutrition.sugar_g, remaining.sugar_g, "g")}
        ${renderMacroBar("Protein", p.nutrition.protein_g, remaining.protein_g, "g")}
        ${renderMacroBar("Sodium", p.nutrition.sodium_mg, remaining.sodium_mg, "mg")}
      </div>

      <div class="panel">
        <div class="panel-title">Nutrient Breakdown</div>
        <div class="panel-sub">Per serving (${p.servingLabel})</div>
        ${["sugar_g", "satFat_g", "sodium_mg", "fiber_g", "protein_g"]
          .map((k) => {
            const light = nutrientLight(k, p.nutrition[k]);
            return `<div class="nutrient-row">
              <div class="left">
                <div class="nutrient-dot" style="background:${LIGHT_COLOR[light]};"></div>
                <div>
                  <div class="nlabel">${NUTRIENT_META[k].label}</div>
                </div>
              </div>
              <div class="nval">${nutrientDescription(k, p)}</div>
            </div>`;
          })
          .join("")}
      </div>

      ${renderIngredientsPanel(p)}

      ${
        p.positiveFlags.length || p.concernMarkers.length
          ? `<div class="panel">
              <div class="panel-title">Worth Knowing</div>
              ${p.positiveFlags.map((f) => `<div class="flag-row positive"><div class="dot"></div><div>${f}</div></div>`).join("")}
              ${p.concernMarkers.map((f) => `<div class="flag-row negative"><div class="dot"></div><div>${f}</div></div>`).join("")}
            </div>`
          : ""
      }

      ${
        swap
          ? `<div class="section-label">Try This Instead</div>
             <div class="swap-card" onclick="openProduct('${swap.id}')">
               ${thumbHTML(swap, "thumb-sm")}
               <div>
                 <div class="label">Market</div>
                 <div class="name">${swap.name}</div>
               </div>
             </div>`
          : ""
      }

      <div class="methodology-link" onclick="openMethodology()">${ICONS.info}<span>How we calculate this</span></div>
    </div>
  </div>`;
}

/* ---------------- Scan overlay ---------------- */
function renderScanOverlay() {
  return `<div class="scan-screen">
    <div class="scan-topbar">
      <div style="font-weight:700;font-size:14px;">Scan</div>
      <div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div>
    </div>
    <div class="scan-viewport">
      <div id="qr-reader" style="display:${state.scanActive ? "block" : "none"};"></div>
      ${
        !state.scanActive
          ? `<div style="text-align:center;">
              <div class="scan-frame"></div>
              <div class="scan-hint">Point your camera at any barcode — in the Market, at the store, or in your kitchen.</div>
            </div>`
          : ""
      }
    </div>
    <div class="scan-bottom">
      ${!state.scanActive ? `<div class="btn-primary" onclick="startCameraScan()">Turn on camera</div>` : `<div class="btn-secondary" onclick="stopCameraScan()">Stop camera</div>`}
      <div class="manual-entry-link" onclick="toggleManualEntry()">Enter barcode manually</div>
      <div class="barcode-input-wrap ${state.manualEntryOpen ? "open" : ""}">
        <input id="manual-barcode-input" type="text" inputmode="numeric" placeholder="e.g. 6281183000061" />
        <div class="btn-primary" onclick="submitManualBarcode()">Look up</div>
      </div>
      <div class="manual-entry-link" onclick="openBrowse()" style="opacity:0.8;">Or browse products instead</div>
    </div>
  </div>`;
}

let html5QrInstance = null;
function startCameraScan() {
  state.scanActive = true;
  render();
  setTimeout(() => {
    try {
      html5QrInstance = new Html5Qrcode("qr-reader");
      html5QrInstance
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            // A fixed pixel qrbox gets positioned against the camera's native
            // decoded resolution, not the visible container — on many phones
            // that resolution is wider than what's on screen, so a fixed
            // 240x150 box renders off-center. Sizing it as a fraction of the
            // actual viewfinder keeps it centered regardless of camera or
            // screen size.
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const boxWidth = Math.floor(minEdge * 0.85);
              return { width: boxWidth, height: Math.floor(boxWidth * 0.6) };
            },
          },
          (decodedText) => {
            stopCameraScan();
            handleScanResult(decodedText);
          },
          () => {}
        )
        .catch(() => {
          // Camera unavailable/denied — guaranteed fallback paths (manual entry, browse) remain.
          state.scanActive = false;
          state.manualEntryOpen = true;
          render();
        });
    } catch (e) {
      state.scanActive = false;
      state.manualEntryOpen = true;
      render();
    }
  }, 50);
}
function stopCameraScan() {
  if (html5QrInstance) {
    html5QrInstance.stop().catch(() => {});
    html5QrInstance = null;
  }
  state.scanActive = false;
  render();
}
function toggleManualEntry() {
  state.manualEntryOpen = !state.manualEntryOpen;
  render();
  if (state.manualEntryOpen) setTimeout(() => document.getElementById("manual-barcode-input")?.focus(), 50);
}
function submitManualBarcode() {
  const val = document.getElementById("manual-barcode-input")?.value?.trim();
  if (!val) return;
  handleScanResult(val);
}
function handleScanResult(code) {
  const p = getProductByBarcode(code);
  state.manualEntryOpen = false;
  if (p) {
    state.overlay = { type: "result", id: p.id };
    state.ingredientsExpanded = false;
  } else {
    state.overlay = { type: "notFound", code };
  }
  render();
}

/* ---------------- Browse overlay ---------------- */
// The one listing that always covers the full 31-SKU catalogue, Market or
// not — so this is where "sort the whole catalogue by score" lives.
function renderBrowseOverlay() {
  const sorted = sortProductsByScore(PRODUCTS, state.browseSort);
  return `<div class="overlay">
    <div class="overlay-header">
      <div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div>
      <div style="font-weight:800;font-size:14px;">Browse Products</div>
    </div>
    <div class="overlay-body">
      <div class="search-input-wrap">${ICONS.search}<input placeholder="Search products or brands" disabled /></div>
      ${renderSortRow(state.browseSort, "setBrowseSort", true)}
      ${sorted.map((p) => {
        const result = computeCaloScore(p);
        const tier = tierForScore(result.score);
        return `<div class="browse-row" onclick="openProduct('${p.id}')">
          ${thumbHTML(p, "thumb-sm2")}
          <div style="flex:1;min-width:0;">
            <div class="name">${p.name}</div>
            <div class="brand">${p.brand} · ${CATEGORY_LABELS[p.category] || p.category}</div>
          </div>
          <div class="browse-row-score" style="${scoreBadgeStyle(tier)}">${result.score}</div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

/* ---------------- Cart overlay ---------------- */
function renderCartOverlay() {
  const entries = Object.entries(state.cart)
    .map(([id, qty]) => ({ p: getProduct(id), qty }))
    .filter((e) => e.p);
  const total = cartTotal();

  return `<div class="overlay">
    <div class="overlay-header">
      <div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div>
      <div style="font-weight:800;font-size:14px;">Your Cart</div>
    </div>
    <div class="overlay-body">
      ${
        !entries.length
          ? `<div class="empty-state">
              <div class="emoji">🛒</div>
              <h3>Your cart is empty</h3>
              <p>Add products from the Market to see them here.</p>
              <div class="btn-primary" onclick="openTab('market')">Go to Market</div>
            </div>`
          : `
            <p class="page-sub" style="margin-top:2px;">Prices shown are illustrative AED estimates for this prototype, not live Market pricing.</p>
            ${entries
              .map(
                (e) => `<div class="cart-row">
                  ${thumbHTML(e.p, "thumb-sm2")}
                  <div class="cart-row-info">
                    <div class="brand">${e.p.brand}</div>
                    <div class="name">${e.p.name}</div>
                    <div class="price-tag">AED ${e.p.priceAED.toFixed(2)}</div>
                  </div>
                  <div class="qty-stepper">
                    <span class="qty-btn" onclick="changeCartQty('${e.p.id}', -1)">${ICONS.minus}</span>
                    <span class="qty-num">${e.qty}</span>
                    <span class="qty-btn" onclick="changeCartQty('${e.p.id}', 1)">${ICONS.plus}</span>
                  </div>
                  <span class="cart-remove" onclick="removeFromCart('${e.p.id}')">${ICONS.trash}</span>
                </div>`
              )
              .join("")}
            <div class="cart-total-row">
              <span>Subtotal</span>
              <span class="cart-total-amt">AED ${total.toFixed(2)}</span>
            </div>
            <div class="btn-primary" style="margin-top:16px;" onclick="toggleCheckoutNote()">Checkout</div>
            ${state._checkoutNote ? `<p class="checkout-note">This is a prototype — checkout isn't wired up to real payment or fulfillment.</p>` : ""}
          `
      }
    </div>
  </div>`;
}

/* ---------------- Not found overlay ---------------- */
function renderNotFoundOverlay(code) {
  return `<div class="overlay">
    <div class="overlay-header">
      <div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div>
      <div style="font-weight:800;font-size:14px;">Scan Result</div>
    </div>
    <div class="overlay-body">
      <div class="empty-state">
        <div class="emoji">🔍</div>
        <h3>Not in our database yet</h3>
        <p>Barcode ${code} isn't scored yet. We're expanding the database every week — thanks for the signal, this helps us prioritize.</p>
        <div class="btn-primary" onclick="openBrowse()">Browse products instead</div>
      </div>
    </div>
  </div>`;
}

/* ---------------- Methodology sheet ---------------- */
function renderMethodologySheet() {
  return `<div class="sheet-overlay" onclick="if(event.target===this) closeSheet()">
    <div class="sheet">
      <h3>How we calculate this</h3>
      <p>This score is a 0–100 quality score, computed the same way for every product — whether it's sold in the Market or not.</p>
      <div class="weight-row"><span>Sugar</span><b>up to −40 pts</b></div>
      <div class="weight-row"><span>Saturated fat</span><b>up to −15 pts</b></div>
      <div class="weight-row"><span>Sodium</span><b>up to −20 pts</b></div>
      <div class="weight-row"><span>Processing markers</span><b>up to −25 pts</b></div>
      <div class="weight-row"><span>Protein</span><b>up to +8 pts</b></div>
      <div class="weight-row"><span>Fiber</span><b>up to +6 pts</b></div>
      <p style="margin-top:14px;">Scored per 100g/100ml — the same normalization the UK Food Standards Agency and Nutri-Score use — so a smaller serving size can't make a product look artificially better.</p>
      <p>Thresholds are the UK FSA's own published front-of-pack "high in" values, not invented for this app. Drinks are judged against the FSA's own separate, stricter drink thresholds (roughly half the solid-food ones) rather than the food table, since a sugary drink is easy to finish in one go even though it reads as "diluted" per 100ml.</p>
      <p>Protein and fiber bonuses don't apply if sugar, saturated fat, or sodium has already hit the FSA's "high" cutoff — a real risk on one number shouldn't be erasable by a good number somewhere else.</p>
      <p><b>Processing markers</b> are set by reviewing each product's full ingredient list and weighing what actually matters — not by counting ingredients. A single ingredient under real regulatory scrutiny counts for more than several common, well-studied additives combined, and things a plain ingredient count would miss — like an unusually easy-to-overeat portion, or a reconstituted ingredient standing in for a whole one — are captured too. The full ingredient list is always shown on the product page for anyone who wants to see exactly what was weighed.</p>
      <p>Allergens are scored separately and never affect this number — see the allergen banner on the product page, which shows regardless of score so it's visible even when scanning on someone else's behalf.</p>
      <div class="btn-secondary" style="margin-top:16px;" onclick="closeSheet()">Close</div>
    </div>
  </div>`;
}

/* ---------------- Edit profile overlay ---------------- */
// Soft, non-blocking sanity check — catches the case where the goal and the
// target weight actively contradict each other (e.g. "Gain weight" with a
// target below current weight), rather than staying silent about it.
function profileGoalWarning(d) {
  if (d.goal === "gain_weight" && d.targetWeightKg <= d.weightKg) {
    return `Goal is "Gain weight" but your target (${d.targetWeightKg}kg) isn't above your current weight (${d.weightKg}kg).`;
  }
  if (d.goal === "lose_weight" && d.targetWeightKg >= d.weightKg) {
    return `Goal is "Lose weight" but your target (${d.targetWeightKg}kg) isn't below your current weight (${d.weightKg}kg).`;
  }
  return null;
}

function renderEditProfileOverlay() {
  const d = state.editDraft;
  return `<div class="overlay">
    <div class="overlay-header">
      <div class="close-btn" onclick="closeOverlay()">${ICONS.close}</div>
      <div style="font-weight:800;font-size:14px;">Edit Profile</div>
    </div>
    <div class="overlay-body">
      <div class="form-row"><label>Name</label><input value="${d.name}" oninput="d('name', this.value)" /></div>
      <div class="form-row-2">
        <div class="form-row"><label>Gender</label>
          <select onchange="d('gender', this.value)">
            <option value="female" ${d.gender === "female" ? "selected" : ""}>Female</option>
            <option value="male" ${d.gender === "male" ? "selected" : ""}>Male</option>
          </select>
        </div>
        <div class="form-row"><label>Age</label><input type="number" value="${d.age}" oninput="d('age', +this.value)" /></div>
      </div>
      <div class="form-row-2">
        <div class="form-row"><label>Height (cm)</label><input type="number" value="${d.heightCm}" oninput="d('heightCm', +this.value)" /></div>
        <div class="form-row"><label>Weight (kg)</label><input type="number" value="${d.weightKg}" oninput="d('weightKg', +this.value)" onchange="render()" /></div>
      </div>
      <div class="form-row"><label>Target weight (kg)</label><input type="number" value="${d.targetWeightKg}" oninput="d('targetWeightKg', +this.value)" onchange="render()" /></div>
      <div class="form-row"><label>Goal</label>
        <select onchange="d('goal', this.value); render()">
          ${Object.entries(GOAL_LABELS).map(([k, v]) => `<option value="${k}" ${d.goal === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </div>
      ${profileGoalWarning(d) ? `<div class="form-warning">${ICONS.alert}<div>${profileGoalWarning(d)}</div></div>` : ""}
      <div class="form-row"><label>Activity level</label>
        <select onchange="d('activityLevel', this.value)">
          ${Object.entries(ACTIVITY_LABELS).map(([k, v]) => `<option value="${k}" ${d.activityLevel === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </div>
      <div class="form-row">
        <label>Food allergies</label>
        <div class="allergy-grid">
          ${ALL_ALLERGENS.map(
            (a) => `<div class="allergy-pill ${d.allergies.includes(a) ? "selected" : ""}" onclick="toggleAllergy('${a}')">${ALLERGEN_LABELS[a]}</div>`
          ).join("")}
        </div>
      </div>
      <div class="btn-primary" style="margin-top:8px;" onclick="saveProfile()">Save profile</div>
    </div>
  </div>`;
}
function d(key, val) {
  state.editDraft[key] = val;
}
function toggleAllergy(a) {
  const list = state.editDraft.allergies;
  const i = list.indexOf(a);
  if (i >= 0) list.splice(i, 1);
  else list.push(a);
  render();
}
function saveProfile() {
  state.profile = state.editDraft;
  state.editDraft = null;
  state.overlay = null;
  render();
}

/* ---------------- Nav / overlay controllers ---------------- */
function openTab(tab) {
  state.tab = tab;
  state.overlay = null;
  render();
}
function openProduct(id) {
  state.overlay = { type: "result", id };
  state.ingredientsExpanded = false;
  render();
}
function toggleIngredients() {
  state.ingredientsExpanded = !state.ingredientsExpanded;
  render();
}
function openScan() {
  state.overlay = { type: "scan" };
  state.scanActive = false;
  state.manualEntryOpen = false;
  render();
}
function openBrowse() {
  state.overlay = { type: "browse" };
  render();
}
function openMethodology() {
  state._sheet = "methodology";
  render();
}
function openSupportSheet() {
  state._sheet = "support";
  render();
}
function closeSheet() {
  state._sheet = null;
  render();
}
function openEditProfile() {
  state.editDraft = JSON.parse(JSON.stringify(state.profile));
  state.overlay = { type: "editProfile" };
  render();
}
function closeOverlay() {
  if (html5QrInstance) {
    html5QrInstance.stop().catch(() => {});
    html5QrInstance = null;
  }
  state.overlay = null;
  state._sheet = null;
  render();
}
function setMarketFilter(c) {
  state.marketFilter = c;
  render();
}
function setMarketSort(v) {
  state.marketSort = v;
  render();
}
function setBrowseSort(v) {
  state.browseSort = v;
  render();
}

/* ---------------- Root render ---------------- */
// Tracks what the previous render() call showed, so we can tell an in-place
// content update (toggling ingredients, adding to cart, editing a profile
// field) apart from real navigation (opening a different product, switching
// tabs). Rebuilding #app's innerHTML on every render loses scroll position
// by default; we only want that reset on real navigation, not on every
// small state change to the screen already on screen.
let _lastRenderKey = null;

function render() {
  const renderKey =
    state.tab +
    "|" +
    (state.overlay ? state.overlay.type + ":" + (state.overlay.id || state.overlay.code || "") : "none") +
    "|" +
    (state._sheet || "");
  const sameScreen = renderKey === _lastRenderKey;

  let prevAppScroll = 0;
  let prevOverlayScroll = 0;
  if (sameScreen) {
    const prevAppContent = document.querySelector(".app-content");
    const prevOverlayBody = document.querySelector(".overlay-body");
    if (prevAppContent) prevAppScroll = prevAppContent.scrollTop;
    if (prevOverlayBody) prevOverlayScroll = prevOverlayBody.scrollTop;
  }

  let html = "";
  switch (state.tab) {
    case "meals":
      html = renderMeals();
      break;
    case "market":
      html = renderMarket();
      break;
    case "cafe":
      html = renderCafe();
      break;
    case "account":
      html = renderAccount();
      break;
  }

  if (state.overlay) {
    if (state.overlay.type === "result") html += renderResultOverlay(state.overlay.id);
    if (state.overlay.type === "scan") html += renderScanOverlay();
    if (state.overlay.type === "browse") html += renderBrowseOverlay();
    if (state.overlay.type === "notFound") html += renderNotFoundOverlay(state.overlay.code);
    if (state.overlay.type === "editProfile") html += renderEditProfileOverlay();
    if (state.overlay.type === "cart") html += renderCartOverlay();
  }
  if (state._sheet === "methodology") html += renderMethodologySheet();
  if (state._sheet === "support") html += renderSupportSheet();

  document.getElementById("app").innerHTML = html;

  if (sameScreen) {
    const newAppContent = document.querySelector(".app-content");
    const newOverlayBody = document.querySelector(".overlay-body");
    if (newAppContent) newAppContent.scrollTop = prevAppScroll;
    if (newOverlayBody) newOverlayBody.scrollTop = prevOverlayScroll;
  }
  _lastRenderKey = renderKey;
}

render();
