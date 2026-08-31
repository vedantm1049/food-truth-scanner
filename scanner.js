/** Food Truth Scanner — retail barcode scanner feature. */

function isValidRetailBarcode(code) {
  const raw = String(code || "").trim();
  if (!/^\d+$/.test(raw) || ![8, 12, 13, 14].includes(raw.length)) return false;
  const digits = raw.split("").map(Number);
  const check = digits.pop();
  const total = digits.reverse().reduce(
    (sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1),
    0
  );
  return (10 - (total % 10)) % 10 === check;
}

function normalizeScannedBarcode(code) {
  const raw = String(code || "").trim();
  return isValidRetailBarcode(raw) ? raw : "";
}

function scannerFormats() {
  if (typeof Html5QrcodeSupportedFormats === "undefined") return undefined;
  return [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.ITF,
  ].filter((x) => x != null);
}

function scannerErrorMessage(err) {
  const text = String(err?.message || err || "").toLowerCase();
  if (/permission|notallowed|denied/.test(text)) return "Camera access was blocked. Allow camera permission for this site, or enter the barcode manually.";
  if (/notfound|device|camera/.test(text)) return "No usable camera was found. You can still enter the barcode manually.";
  if (/secure|https/.test(text)) return "Camera scanning requires a secure HTTPS page. You can still enter the barcode manually.";
  return "The camera could not start reliably. Try again, or enter the barcode manually.";
}

function installScanner() {
  let runId = 0;
  let handlingResult = false;

  async function safelyStopScanner() {
    const instance = html5QrInstance;
    html5QrInstance = null;
    if (!instance) return;
    try { await instance.stop(); } catch (_) {}
    try { await instance.clear(); } catch (_) {}
  }

  function invalidBarcode() {
    state.scanActive = false;
    state.manualEntryOpen = true;
    state.scannerError = "Enter a valid retail barcode (EAN/UPC/GTIN) with 8, 12, 13 or 14 digits.";
    render();
    setTimeout(() => document.getElementById("manual-barcode-input")?.focus(), 50);
  }

  const baseGetProductByBarcode = getProductByBarcode;
  getProductByBarcode = function(code) {
    const normalized = normalizeScannedBarcode(code);
    if (!normalized) return undefined;
    let product = baseGetProductByBarcode(normalized);
    if (product) return product;
    if (/^\d{12}$/.test(normalized)) {
      const ean = `0${normalized}`;
      if (isValidRetailBarcode(ean)) {
        product = baseGetProductByBarcode(ean);
        if (product) return product;
      }
    }
    if (/^0\d{12}$/.test(normalized)) {
      const upc = normalized.slice(1);
      if (isValidRetailBarcode(upc)) {
        product = baseGetProductByBarcode(upc);
        if (product) return product;
      }
    }
    return undefined;
  };

  const baseHandleScanResult = handleScanResult;
  handleScanResult = async function(code) {
    const normalized = normalizeScannedBarcode(code);
    if (!normalized) return invalidBarcode();
    return baseHandleScanResult(normalized);
  };

  stopCameraScan = async function(shouldRender = true) {
    runId += 1;
    handlingResult = false;
    await safelyStopScanner();
    state.scanActive = false;
    if (shouldRender && state.overlay?.type === "scan") render();
  };

  startCameraScan = async function() {
    const thisRun = ++runId;
    state.scannerError = "";
    handlingResult = false;

    if (typeof Html5Qrcode === "undefined") {
      state.scanActive = false;
      state.manualEntryOpen = true;
      state.scannerError = "The barcode-scanning library did not load. Enter the barcode manually.";
      render();
      return;
    }

    await safelyStopScanner();
    if (thisRun !== runId) return;

    state.scanActive = true;
    render();
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (thisRun !== runId || state.overlay?.type !== "scan") return;
    if (!document.getElementById("qr-reader")) return;

    try {
      const formats = scannerFormats();
      html5QrInstance = formats?.length
        ? new Html5Qrcode("qr-reader", { formatsToSupport: formats }, false)
        : new Html5Qrcode("qr-reader");

      await html5QrInstance.start(
        { facingMode: { ideal: "environment" } },
        {
          fps: 12,
          aspectRatio: 1.777778,
          disableFlip: false,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.max(220, Math.floor(viewfinderWidth * 0.9));
            const height = Math.max(120, Math.min(Math.floor(width * 0.48), Math.floor(viewfinderHeight * 0.65)));
            return { width: Math.min(width, viewfinderWidth), height: Math.min(height, viewfinderHeight) };
          },
        },
        async (decodedText) => {
          if (handlingResult || thisRun !== runId) return;
          const normalized = normalizeScannedBarcode(decodedText);
          if (!normalized) return;
          handlingResult = true;
          await safelyStopScanner();
          state.scanActive = false;
          if (thisRun !== runId) return;
          await handleScanResult(normalized);
        },
        () => {}
      );
    } catch (err) {
      if (thisRun !== runId) return;
      await safelyStopScanner();
      state.scanActive = false;
      state.manualEntryOpen = true;
      state.scannerError = scannerErrorMessage(err);
      render();
      setTimeout(() => document.getElementById("manual-barcode-input")?.focus(), 50);
    }
  };

  const baseCloseOverlay = closeOverlay;
  closeOverlay = async function() {
    if (state.overlay?.type === "scan" || html5QrInstance) {
      runId += 1;
      await safelyStopScanner();
      state.scanActive = false;
    }
    return baseCloseOverlay();
  };

  const baseRenderScanOverlay = renderScanOverlay;
  renderScanOverlay = function() {
    const html = baseRenderScanOverlay();
    if (!state.scannerError) return html;
    return html.replace(
      '<div class="scan-bottom">',
      `<div class="scan-bottom"><div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:10px 12px;font-size:12px;line-height:1.4;">${state.scannerError}</div>`
    );
  };
}
