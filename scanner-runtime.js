/* Barcode-scanner reliability layer.
 * Loaded after the main app/runtime so it can replace the prototype camera
 * lifecycle without duplicating the rest of the application.
 */

let _scannerRunId = 0;
let _scannerHandlingResult = false;

function scannerFormats() {
  if (typeof Html5QrcodeSupportedFormats === "undefined") return undefined;
  return [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.ITF,
  ].filter((x) => x != null);
}

function scannerErrorMessage(err) {
  const text = String(err?.message || err || "").toLowerCase();
  if (/permission|notallowed|denied/.test(text)) {
    return "Camera access was blocked. Allow camera permission for this site, or enter the barcode manually.";
  }
  if (/notfound|device|camera/.test(text)) {
    return "No usable camera was found. You can still enter the barcode manually.";
  }
  if (/secure|https/.test(text)) {
    return "Camera scanning requires a secure HTTPS page. You can still enter the barcode manually.";
  }
  return "The camera could not start reliably. Try again, or enter the barcode manually.";
}

async function safelyStopScanner() {
  const instance = html5QrInstance;
  html5QrInstance = null;
  if (!instance) return;
  try {
    await instance.stop();
  } catch (_) {}
  try {
    await instance.clear();
  } catch (_) {}
}

stopCameraScan = async function(shouldRender = true) {
  _scannerRunId += 1;
  _scannerHandlingResult = false;
  await safelyStopScanner();
  state.scanActive = false;
  if (shouldRender && state.overlay?.type === "scan") render();
};

startCameraScan = async function() {
  const runId = ++_scannerRunId;
  state.scannerError = "";
  _scannerHandlingResult = false;

  if (typeof Html5Qrcode === "undefined") {
    state.scanActive = false;
    state.manualEntryOpen = true;
    state.scannerError = "The barcode-scanning library did not load. Enter the barcode manually.";
    render();
    return;
  }

  await safelyStopScanner();
  if (runId !== _scannerRunId) return;

  state.scanActive = true;
  render();
  await new Promise((resolve) => setTimeout(resolve, 120));
  if (runId !== _scannerRunId || state.overlay?.type !== "scan") return;

  const reader = document.getElementById("qr-reader");
  if (!reader) return;

  try {
    const formats = scannerFormats();
    html5QrInstance = formats?.length
      ? new Html5Qrcode("qr-reader", { formatsToSupport: formats }, false)
      : new Html5Qrcode("qr-reader", false);

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
        if (_scannerHandlingResult || runId !== _scannerRunId) return;
        _scannerHandlingResult = true;
        const normalized = String(decodedText || "").replace(/\s+/g, "").trim();
        if (!normalized) {
          _scannerHandlingResult = false;
          return;
        }
        await safelyStopScanner();
        state.scanActive = false;
        if (runId !== _scannerRunId) return;
        await handleScanResult(normalized);
      },
      () => {}
    );
  } catch (err) {
    if (runId !== _scannerRunId) return;
    await safelyStopScanner();
    state.scanActive = false;
    state.manualEntryOpen = true;
    state.scannerError = scannerErrorMessage(err);
    render();
    setTimeout(() => document.getElementById("manual-barcode-input")?.focus(), 50);
  }
};

const _scannerBaseRenderScanOverlay = renderScanOverlay;
renderScanOverlay = function() {
  const html = _scannerBaseRenderScanOverlay();
  if (!state.scannerError) return html;
  return html.replace(
    '<div class="scan-bottom">',
    `<div class="scan-bottom"><div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:10px 12px;font-size:12px;line-height:1.4;">${state.scannerError}</div>`
  );
};
