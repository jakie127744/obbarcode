(() => {
  const form = document.getElementById("generatorForm");
  const formatEl = document.getElementById("format");
  const dataEl = document.getElementById("data");
  const qrEcEl = document.getElementById("qrEc");
  const lineColorEl = document.getElementById("lineColor");
  const bgColorEl = document.getElementById("bgColor");
  const marginEl = document.getElementById("margin");
  const barWidthEl = document.getElementById("barWidth");
  const barHeightEl = document.getElementById("barHeight");
  const showTextEl = document.getElementById("showText");
  const formatHintEl = document.getElementById("formatHint");
  const inlineValidationEl = document.getElementById("inlineValidation");

  const statusEl = document.getElementById("validationMessage");
  const qrCanvas = document.getElementById("qrCanvas");
  const barcodeSvg = document.getElementById("barcodeSvg");

  const downloadPngBtn = document.getElementById("downloadPng");
  const downloadSvgBtn = document.getElementById("downloadSvg");
  const copySvgBtn = document.getElementById("copySvgBtn");
  const copyBtn = document.getElementById("copyBtn");
  const resetBtn = document.getElementById("resetBtn");
  const generateBtn = document.getElementById("generateBtn");
  const installBtn = document.getElementById("installBtn");
  const themeModeEl = document.getElementById("themeMode");
  const darkAdsEl = document.getElementById("darkAds");

  const csvFileEl = document.getElementById("csvFile");
  const batchInputEl = document.getElementById("batchInput");
  const generateBatchBtn = document.getElementById("generateBatch");
  const downloadBatchZipBtn = document.getElementById("downloadBatchZip");
  const printLabelsBtn = document.getElementById("printLabels");
  const clearBatchBtn = document.getElementById("clearBatch");
  const downloadTemplateBtn = document.getElementById("downloadTemplate");
  const loadExampleCsvBtn = document.getElementById("loadExampleCsv");
  const batchStatusEl = document.getElementById("batchStatus");
  const labelSheetEl = document.getElementById("labelSheet");
  const labelWidthEl = document.getElementById("labelWidth");
  const labelHeightEl = document.getElementById("labelHeight");
  const toastEl = document.getElementById("toast");
  const analyticsSummaryEl = document.getElementById("analyticsSummary");
  const exportAnalyticsBtn = document.getElementById("exportAnalytics");
  const resetAnalyticsBtn = document.getElementById("resetAnalytics");
  const presetNameEl = document.getElementById("presetName");
  const savePresetBtn = document.getElementById("savePresetBtn");
  const savedPresetsEl = document.getElementById("savedPresets");
  const loadPresetBtn = document.getElementById("loadPresetBtn");
  const deletePresetBtn = document.getElementById("deletePresetBtn");
  const recentCodesEl = document.getElementById("recentCodes");
  const runChecksBtn = document.getElementById("runChecksBtn");
  const checksOutputEl = document.getElementById("checksOutput");

  const consentBanner = document.getElementById("consentBanner");
  const consentAccept = document.getElementById("consentAccept");
  const consentReject = document.getElementById("consentReject");

  let currentMode = "QR";
  let deferredInstallPrompt = null;
  let librariesReadyPromise = null;
  let typingTimer = null;
  let toastTimer = null;
  let adsReflowTimer = null;
  const ANALYTICS_KEY = "obAnalyticsV1";
  const PRESETS_KEY = "obSavedPresetsV1";
  const RECENTS_KEY = "obRecentCodesV1";

  const FORMAT_TO_JSBARCODE = {
    CODE128: "CODE128",
    CODE39: "CODE39",
    EAN13: "EAN13",
    UPCA: "UPC"
  };

  function defaultValueByFormat(format) {
    const map = {
      QR: "https://example.com",
      CODE128: "OB123456",
      CODE39: "OB-12345",
      EAN13: "5901234123457",
      UPCA: "036000291452"
    };

    return map[format] || "https://example.com";
  }

  function hintByFormat(format) {
    const hints = {
      QR: "QR Code: great for links, Wi-Fi credentials, and mobile scans.",
      CODE128: "Code 128: best for internal tracking and logistics labels.",
      CODE39: "Code 39: classic alphanumeric format for inventory and asset tags.",
      EAN13: "EAN-13: retail product barcode, 12/13 digits with checksum handling.",
      UPCA: "UPC-A: common retail format in North America, 11/12 digits with checksum."
    };

    return hints[format] || "Select a format to see usage guidance.";
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(script);
    });
  }

  async function ensureLibrariesLoaded() {
    if (window.qrcode && window.JsBarcode) {
      return true;
    }

    if (librariesReadyPromise) {
      return librariesReadyPromise;
    }

    librariesReadyPromise = (async () => {
      const loaders = [];

      if (!window.JsBarcode) {
        loaders.push(
          (async () => {
            try {
              await loadScript("https://cdn.jsdelivr.net/npm/jsbarcode@3.12.1/dist/JsBarcode.all.min.js");
            } catch (_error) {
              await loadScript("https://unpkg.com/jsbarcode@3.12.1/dist/JsBarcode.all.min.js");
            }
          })()
        );
      }

      if (!window.qrcode) {
        loaders.push(
          (async () => {
            try {
              await loadScript("vendor/qrcode-generator.min.js");
            } catch (_error) {
              await loadScript("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js");
            }
          })()
        );
      }

      try {
        await Promise.all(loaders);
      } catch (_error) {
        return false;
      }

      return Boolean(window.qrcode && window.JsBarcode);
    })();

    return librariesReadyPromise;
  }

  async function ensureZipLibraryLoaded() {
    if (window.JSZip) {
      return true;
    }

    try {
      await loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
    } catch (_error) {
      try {
        await loadScript("https://unpkg.com/jszip@3.10.1/dist/jszip.min.js");
      } catch (_secondError) {
        return false;
      }
    }

    return Boolean(window.JSZip);
  }

  function applyInputMask(rawValue, format) {
    if (format === "EAN13" || format === "UPCA") {
      return rawValue.replace(/\D/g, "");
    }

    if (format === "CODE39") {
      return rawValue.toUpperCase().replace(/[^0-9A-Z\-\.$\/\+% ]/g, "");
    }

    return rawValue;
  }

  function getQuietZonePx(format) {
    const margin = Number(marginEl.value) || 0;
    if (format === "QR") {
      return margin;
    }

    const barModule = Number(barWidthEl.value) || 1;
    return margin * barModule;
  }

  function getModuleSizePx(format) {
    if (format === "QR") {
      const text = dataEl.value.trim();
      if (!text || !window.qrcode) {
        return 0;
      }

      const qr = createQrModel(text);
      const count = qr.getModuleCount();
      const margin = Number(marginEl.value) || 4;
      return Math.max(1, Math.floor((320 - margin * 2) / count));
    }

    return Number(barWidthEl.value) || 1;
  }

  function scannerConfidenceWarnings() {
    const format = formatEl.value;
    const warnings = [];
    const contrast = contrastRatio(lineColorEl.value, bgColorEl.value);

    if (contrast < 4.5) {
      warnings.push("Low contrast detected (recommended >= 4.5:1).");
    }

    if (getModuleSizePx(format) < 2) {
      warnings.push("Module width is small; scans may fail on low-end cameras.");
    }

    if (getQuietZonePx(format) < 4) {
      warnings.push("Quiet zone is narrow. Increase margin to improve scan reliability.");
    }

    if (format !== "QR" && Number(barHeightEl.value) < 60) {
      warnings.push("Barcode height is low; consider 60px or higher for better reads.");
    }

    return warnings;
  }

  function confirmExportReadiness(actionName) {
    const warnings = scannerConfidenceWarnings();
    if (!warnings.length) {
      return true;
    }

    const warningMessage = `${actionName} warning:\n- ${warnings.join("\n- ")}\n\nProceed anyway?`;
    const proceed = window.confirm(warningMessage);
    if (!proceed) {
      setStatus("Export canceled. Adjust contrast, margin, or module size first.", "error");
    }
    return proceed;
  }

  function loadPresets() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function savePresets(presets) {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }

  function loadRecents() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveRecents(recents) {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  }

  function collectCurrentState() {
    return {
      format: formatEl.value,
      data: dataEl.value.trim(),
      qrEc: qrEcEl.value,
      lineColor: lineColorEl.value,
      bgColor: bgColorEl.value,
      margin: marginEl.value,
      barWidth: barWidthEl.value,
      barHeight: barHeightEl.value,
      showText: showTextEl.checked
    };
  }

  function applySavedState(state) {
    formatEl.value = state.format || "QR";
    dataEl.value = state.data || defaultValueByFormat(formatEl.value);
    qrEcEl.value = state.qrEc || "M";
    lineColorEl.value = state.lineColor || "#111111";
    bgColorEl.value = state.bgColor || "#ffffff";
    marginEl.value = state.margin || "8";
    barWidthEl.value = state.barWidth || "2";
    barHeightEl.value = state.barHeight || "100";
    showTextEl.checked = Boolean(state.showText);
    updateFormatHint();
    generateCode();
  }

  function renderSavedPresets() {
    if (!savedPresetsEl) {
      return;
    }

    const presets = loadPresets();
    savedPresetsEl.innerHTML = '<option value="">Select a saved preset</option>';

    presets.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = `${preset.name} (${preset.state.format})`;
      savedPresetsEl.appendChild(option);
    });
  }

  function renderRecentCodes() {
    if (!recentCodesEl) {
      return;
    }

    recentCodesEl.innerHTML = "";
    const recents = loadRecents();
    if (!recents.length) {
      recentCodesEl.textContent = "No recent codes yet.";
      return;
    }

    recents.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "recent-code";
      btn.title = `${item.format}: ${item.data}`;
      btn.textContent = `${item.format}: ${item.data}`;
      btn.addEventListener("click", () => applySavedState(item));
      recentCodesEl.appendChild(btn);
    });
  }

  function rememberCurrentCode() {
    const current = collectCurrentState();
    if (!current.data) {
      return;
    }

    const recents = loadRecents();
    const deduped = recents.filter((item) => !(item.format === current.format && item.data === current.data));
    deduped.unshift(current);
    saveRecents(deduped.slice(0, 8));
    renderRecentCodes();
  }

  function addCheckResult(message, level = "ok") {
    if (!checksOutputEl) {
      return;
    }

    const li = document.createElement("li");
    li.className = level;
    li.textContent = message;
    checksOutputEl.appendChild(li);
  }

  function resolveThemeMode(mode) {
    if (mode === "system") {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? "dark" : "light";
    }

    return mode;
  }

  function applyAdThemePreference() {
    if (!darkAdsEl) {
      return;
    }
    const dark = document.body.classList.contains("dark");
    const darkAds = darkAdsEl.checked;
    if (dark && darkAds) {
      document.body.classList.add("ads-dark");
    } else {
      document.body.classList.remove("ads-dark");
    }
  }

  function setTheme(mode, persistMode = true) {
    const resolvedMode = resolveThemeMode(mode);

    if (resolvedMode === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    if (persistMode) {
      localStorage.setItem("obThemeMode", mode);
    }

    applyAdThemePreference();
  }

  function initTheme() {
    if (!themeModeEl || !darkAdsEl) {
      return;
    }

    const savedThemeMode = localStorage.getItem("obThemeMode");
    const savedDarkAds = localStorage.getItem("obDarkAds");

    if (savedDarkAds === null) {
      darkAdsEl.checked = true;
    } else {
      darkAdsEl.checked = savedDarkAds === "true";
    }

    const initialThemeMode = savedThemeMode || "system";
    themeModeEl.value = initialThemeMode;
    setTheme(initialThemeMode, false);

    themeModeEl.addEventListener("change", () => {
      setTheme(themeModeEl.value);
    });

    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", () => {
        if (themeModeEl.value === "system") {
          setTheme("system", false);
        }
      });
    }

    darkAdsEl.addEventListener("change", () => {
      localStorage.setItem("obDarkAds", String(darkAdsEl.checked));
      applyAdThemePreference();
    });
  }

  function setStatus(message, type = "success") {
    statusEl.textContent = message;
    statusEl.classList.remove("error", "success");
    statusEl.classList.add(type);
  }

  function setInlineValidation(message = "", type = "error") {
    if (!inlineValidationEl) {
      return;
    }

    inlineValidationEl.textContent = message;
    inlineValidationEl.classList.remove("ok");
    if (message && type === "ok") {
      inlineValidationEl.classList.add("ok");
    }
  }

  function loadAnalytics() {
    const fallback = {
      pageViews: 0,
      generates: 0,
      previewRenders: 0,
      manualGenerateClicks: 0,
      downloadPng: 0,
      downloadSvg: 0,
      copies: 0,
      batchGenerates: 0,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    try {
      const parsed = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || "null");
      return parsed ? { ...fallback, ...parsed } : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function saveAnalytics(analytics) {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
  }

  function renderAnalyticsSummary() {
    if (!analyticsSummaryEl) {
      return;
    }

    const analytics = loadAnalytics();
    const downloads = analytics.downloadPng + analytics.downloadSvg;
    const conversionRate = analytics.pageViews > 0
      ? ((downloads / analytics.pageViews) * 100).toFixed(1)
      : "0.0";

    analyticsSummaryEl.textContent =
      `Page views: ${analytics.pageViews} | Preview renders: ${analytics.previewRenders} | ` +
      `Manual generates: ${analytics.manualGenerateClicks} | ` +
      `Downloads: ${downloads} | Copy: ${analytics.copies} | Batch: ${analytics.batchGenerates} | ` +
      `Landing->Download: ${conversionRate}%`;
  }

  function trackEvent(name) {
    const analytics = loadAnalytics();
    if (name in analytics && typeof analytics[name] === "number") {
      analytics[name] += 1;
    }
    analytics.lastSeen = new Date().toISOString();
    saveAnalytics(analytics);
    renderAnalyticsSummary();
  }

  function initAnalytics() {
    const seenThisTab = sessionStorage.getItem("obPageViewTracked") === "1";
    if (!seenThisTab) {
      trackEvent("pageViews");
      sessionStorage.setItem("obPageViewTracked", "1");
    } else {
      renderAnalyticsSummary();
    }

    if (exportAnalyticsBtn) {
      exportAnalyticsBtn.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(loadAnalytics(), null, 2)], { type: "application/json" });
        downloadBlob(blob, "ob-analytics.json");
        showToast("Metrics exported");
      });
    }

    if (resetAnalyticsBtn) {
      resetAnalyticsBtn.addEventListener("click", () => {
        localStorage.removeItem(ANALYTICS_KEY);
        sessionStorage.removeItem("obPageViewTracked");
        renderAnalyticsSummary();
        showToast("Metrics reset");
      });
    }
  }

  function showToast(message) {
    if (!toastEl) {
      return;
    }

    toastEl.textContent = message;
    toastEl.classList.remove("hidden");

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 1800);
  }

  function setBatchStatus(message, type = "success") {
    batchStatusEl.textContent = message;
    batchStatusEl.classList.remove("error", "success");
    batchStatusEl.classList.add(type);
  }

  function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    const value = normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;

    return {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16)
    };
  }

  function luminance({ r, g, b }) {
    const map = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };

    const R = map(r);
    const G = map(g);
    const B = map(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function contrastRatio(hexA, hexB) {
    const L1 = luminance(hexToRgb(hexA));
    const L2 = luminance(hexToRgb(hexB));
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function calcEan13CheckDigit(first12) {
    let sum = 0;
    for (let i = 0; i < first12.length; i += 1) {
      const digit = Number(first12[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    return String((10 - (sum % 10)) % 10);
  }

  function calcUpcACheckDigit(first11) {
    let odd = 0;
    let even = 0;

    for (let i = 0; i < first11.length; i += 1) {
      const digit = Number(first11[i]);
      if (i % 2 === 0) {
        odd += digit;
      } else {
        even += digit;
      }
    }

    const total = odd * 3 + even;
    return String((10 - (total % 10)) % 10);
  }

  function normalizeCodeValue(format, rawValue) {
    const trimmed = rawValue.trim();

    if (!trimmed) {
      return { ok: false, message: "Data is required." };
    }

    if (format === "EAN13") {
      if (!/^\d{12,13}$/.test(trimmed)) {
        return { ok: false, message: "EAN-13 must contain 12 or 13 digits." };
      }

      if (trimmed.length === 12) {
        const full = trimmed + calcEan13CheckDigit(trimmed);
        return { ok: true, value: full, message: `EAN-13 check digit added automatically: ${full}` };
      }

      const expected = calcEan13CheckDigit(trimmed.slice(0, 12));
      if (trimmed[12] !== expected) {
        return { ok: false, message: `Invalid EAN-13 checksum. Expected last digit ${expected}.` };
      }
    }

    if (format === "UPCA") {
      if (!/^\d{11,12}$/.test(trimmed)) {
        return { ok: false, message: "UPC-A must contain 11 or 12 digits." };
      }

      if (trimmed.length === 11) {
        const full = trimmed + calcUpcACheckDigit(trimmed);
        return { ok: true, value: full, message: `UPC-A check digit added automatically: ${full}` };
      }

      const expected = calcUpcACheckDigit(trimmed.slice(0, 11));
      if (trimmed[11] !== expected) {
        return { ok: false, message: `Invalid UPC-A checksum. Expected last digit ${expected}.` };
      }
    }

    if (format === "CODE39") {
      const normalized = trimmed.toUpperCase();
      if (!/^[0-9A-Z\-\.$\/\+% ]+$/.test(normalized)) {
        return { ok: false, message: "Code 39 allows A-Z, 0-9, space, and - . $ / + %." };
      }

      if (normalized !== trimmed) {
        return {
          ok: true,
          value: normalized,
          message: "Code 39 text converted to uppercase automatically."
        };
      }
    }

    return { ok: true, value: trimmed };
  }

  function validateInput(format, value) {
    const normalized = normalizeCodeValue(format, value);
    return normalized.ok ? "" : normalized.message;
  }

  function showCanvas() {
    qrCanvas.style.display = "block";
    barcodeSvg.style.display = "none";
    currentMode = "QR";
  }

  function showSvg() {
    qrCanvas.style.display = "none";
    barcodeSvg.style.display = "block";
    currentMode = "BARCODE";
  }

  function fitRenderedBarcodeSvg() {
    let width = Number.parseFloat(barcodeSvg.getAttribute("width") || "0");
    let height = Number.parseFloat(barcodeSvg.getAttribute("height") || "0");

    try {
      const bbox = barcodeSvg.getBBox();
      if (bbox && bbox.width > 0 && bbox.height > 0) {
        width = Math.max(width, Math.ceil(bbox.x + bbox.width + 4));
        height = Math.max(height, Math.ceil(bbox.y + bbox.height + 4));
      }
    } catch (_error) {
      // Ignore getBBox failures and rely on attributes when possible.
    }

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      throw new Error("Barcode rendered empty. Try shorter data or increase barcode width.");
    }

    barcodeSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    barcodeSvg.setAttribute("width", String(width));
    barcodeSvg.setAttribute("height", String(height));
    barcodeSvg.style.width = `min(100%, ${width}px)`;
    barcodeSvg.style.height = `${height}px`;
    barcodeSvg.style.display = "block";
  }

  function createQrModel(text) {
    const qr = window.qrcode(0, qrEcEl.value);
    qr.addData(text);
    qr.make();
    return qr;
  }

  function drawQrToCanvas(qr, targetCanvas, pixelSize) {
    const margin = Number(marginEl.value) || 4;
    const count = qr.getModuleCount();
    const scale = Math.max(1, Math.floor((pixelSize - margin * 2) / count));
    const size = count * scale + margin * 2;

    targetCanvas.width = size;
    targetCanvas.height = size;

    const ctx = targetCanvas.getContext("2d");
    ctx.fillStyle = bgColorEl.value;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = lineColorEl.value;

    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(margin + col * scale, margin + row * scale, scale, scale);
        }
      }
    }
  }

  function qrToSvgString(text, pixelSize = 320) {
    const qr = createQrModel(text);
    const margin = Number(marginEl.value) || 4;
    const count = qr.getModuleCount();
    const scale = Math.max(1, Math.floor((pixelSize - margin * 2) / count));
    const size = count * scale + margin * 2;

    const rects = [];
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          rects.push(`<rect x="${margin + col * scale}" y="${margin + row * scale}" width="${scale}" height="${scale}" />`);
        }
      }
    }

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
      `<rect width="100%" height="100%" fill="${bgColorEl.value}"/>`,
      `<g fill="${lineColorEl.value}">`,
      rects.join(""),
      "</g>",
      "</svg>"
    ].join("");
  }

  async function generateQr(text) {
    showCanvas();

    const qr = createQrModel(text);
    drawQrToCanvas(qr, qrCanvas, 320);
    setStatus("QR code generated.");
  }

  function generateBarcode(text, format) {
    showSvg();

    const mappedFormat = FORMAT_TO_JSBARCODE[format] || format;
    const margin = Number(marginEl.value) || 10;
    const width = Number(barWidthEl.value) || 2;
    const height = Number(barHeightEl.value) || 100;

    window.JsBarcode(barcodeSvg, text, {
      format: mappedFormat,
      lineColor: lineColorEl.value,
      background: bgColorEl.value,
      width,
      height,
      margin,
      displayValue: showTextEl.checked,
      valid: (isValid) => {
        if (!isValid) {
          throw new Error("Data is invalid for this barcode format.");
        }
      }
    });

    if (!barcodeSvg.childElementCount) {
      throw new Error("Barcode rendered empty. Please check the input data.");
    }

    fitRenderedBarcodeSvg();

    // Ensure SVG stays visible in dark themes and has explicit sizing.
    barcodeSvg.style.backgroundColor = bgColorEl.value;
    barcodeSvg.style.padding = "6px";
    barcodeSvg.style.borderRadius = "8px";

    const ratio = contrastRatio(lineColorEl.value, bgColorEl.value);
    if (ratio < 3) {
      setStatus("Barcode generated, but contrast is low. Use darker lines or lighter background.", "error");
      return;
    }

    setStatus(`${format} barcode generated.`);
  }

  async function generateCode(eventOrOptions) {
    let manualTrigger = false;
    if (eventOrOptions && typeof eventOrOptions.preventDefault === "function") {
      eventOrOptions.preventDefault();
      manualTrigger = true;
    } else if (eventOrOptions && typeof eventOrOptions === "object") {
      manualTrigger = Boolean(eventOrOptions.manual);
    }

    const format = formatEl.value;
    const maskedValue = applyInputMask(dataEl.value, format);
    if (maskedValue !== dataEl.value) {
      dataEl.value = maskedValue;
    }

    const value = dataEl.value;

    const validationError = validateInput(format, value);
    if (validationError) {
      setInlineValidation(validationError, "error");
      setStatus(validationError, "error");
      return;
    }

    setInlineValidation("");

    const normalized = normalizeCodeValue(format, value);
    const normalizedValue = normalized.value;

    if (normalizedValue !== value.trim()) {
      dataEl.value = normalizedValue;
    }

    if (!window.qrcode || !window.JsBarcode) {
      setStatus("Loading barcode libraries...", "success");
      const loaded = await ensureLibrariesLoaded();
      if (!loaded) {
        setStatus("Libraries failed to load. Check internet/CDN access and refresh.", "error");
        return;
      }
    }

    try {
      if (format === "QR") {
        await generateQr(normalizedValue);
      } else {
        generateBarcode(normalizedValue, format);
      }

      trackEvent("previewRenders");
      if (manualTrigger) {
        trackEvent("manualGenerateClicks");
        trackEvent("generates");
      }
      rememberCurrentCode();

      if (normalized.message) {
        setInlineValidation(normalized.message, "ok");
        setStatus(normalized.message);
      }
    } catch (error) {
      setStatus(error.message || "Unable to generate code.", "error");
    }
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function svgToPngBlob(svgNode) {
    return new Promise((resolve, reject) => {
      const svgString = new XMLSerializer().serializeToString(svgNode);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const width = image.width || 600;
        const height = image.height || 200;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = bgColorEl.value;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(svgUrl);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert SVG to PNG."));
          }
        }, "image/png");
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error("Failed to render SVG image."));
      };

      image.src = svgUrl;
    });
  }

  async function downloadPng() {
    try {
      if (!confirmExportReadiness("PNG export")) {
        return;
      }

      if (currentMode === "QR") {
        const blob = await new Promise((resolve, reject) => {
          qrCanvas.toBlob((result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("QR canvas is empty."));
            }
          }, "image/png");
        });

        downloadBlob(blob, "code.png");
      } else {
        const blob = await svgToPngBlob(barcodeSvg);
        downloadBlob(blob, "barcode.png");
      }

      trackEvent("downloadPng");
      setStatus("PNG downloaded.");
    } catch (error) {
      setStatus(error.message || "Unable to download PNG.", "error");
    }
  }

  async function downloadSvg() {
    try {
      if (!confirmExportReadiness("SVG export")) {
        return;
      }

      if (currentMode === "QR") {
        const text = dataEl.value.trim();
        const svgString = qrToSvgString(text, 320);

        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        downloadBlob(blob, "qr-code.svg");
      } else {
        const svgString = new XMLSerializer().serializeToString(barcodeSvg);
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        downloadBlob(blob, "barcode.svg");
      }

      trackEvent("downloadSvg");
      setStatus("SVG downloaded.");
    } catch (error) {
      setStatus(error.message || "Unable to download SVG.", "error");
    }
  }

  async function copySvg() {
    try {
      if (!confirmExportReadiness("SVG copy")) {
        return;
      }

      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        setStatus("Clipboard text copy is not supported in this browser.", "error");
        return;
      }

      const svgString = currentMode === "QR"
        ? qrToSvgString(dataEl.value.trim(), 320)
        : new XMLSerializer().serializeToString(barcodeSvg);

      await navigator.clipboard.writeText(svgString);
      setStatus("SVG markup copied to clipboard.");
      showToast("SVG copied");
    } catch (error) {
      setStatus(error.message || "Unable to copy SVG.", "error");
    }
  }

  async function copyImage() {
    try {
      if (!confirmExportReadiness("Image copy")) {
        return;
      }

      if (!("clipboard" in navigator) || typeof ClipboardItem === "undefined") {
        setStatus("Clipboard image copy is not supported in this browser.", "error");
        return;
      }

      let blob;
      if (currentMode === "QR") {
        blob = await new Promise((resolve, reject) => {
          qrCanvas.toBlob((result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("QR canvas is empty."));
            }
          }, "image/png");
        });
      } else {
        blob = await svgToPngBlob(barcodeSvg);
      }

      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      trackEvent("copies");
      setStatus("Image copied to clipboard.");
      showToast("Copied to clipboard!");
    } catch (error) {
      setStatus(error.message || "Unable to copy image.", "error");
    }
  }

  async function downloadBatchZip() {
    try {
      if (!labelSheetEl || !labelSheetEl.children.length || labelSheetEl.classList.contains("empty")) {
        setBatchStatus("Generate label sheet first before creating ZIP.", "error");
        return;
      }

      const zipReady = await ensureZipLibraryLoaded();
      if (!zipReady) {
        setBatchStatus("ZIP library failed to load. Check network access and retry.", "error");
        return;
      }

      const zip = new window.JSZip();
      const rows = ["format,data,file"];
      const labels = Array.from(labelSheetEl.querySelectorAll(".label-item"));

      for (let i = 0; i < labels.length; i += 1) {
        const item = labels[i];
        const img = item.querySelector("img");
        const caption = item.querySelector("small");
        if (!img || !caption || !img.src.startsWith("data:image/png;base64,")) {
          continue;
        }

        const [format = "CODE", ...rest] = caption.textContent.split(":");
        const dataValue = rest.join(":").trim();
        const fileName = `label-${String(i + 1).padStart(3, "0")}-${format.trim().toLowerCase()}.png`;
        const base64Data = img.src.replace("data:image/png;base64,", "");
        zip.file(fileName, base64Data, { base64: true });
        rows.push(`${format.trim()},${JSON.stringify(dataValue)},${fileName}`);
      }

      zip.file("manifest.csv", rows.join("\n"));
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "ob-labels-batch.zip");
      setBatchStatus("ZIP downloaded with labels and manifest.");
    } catch (error) {
      setBatchStatus(error.message || "Unable to create ZIP.", "error");
    }
  }

  function parseCsvRows(csvText) {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return [];
    }

    const hasHeader = lines[0].toLowerCase() === "format,data";
    const startIndex = hasHeader ? 1 : 0;

    const rows = [];
    for (let i = startIndex; i < lines.length; i += 1) {
      const raw = lines[i];
      const firstComma = raw.indexOf(",");
      if (firstComma < 0) {
        rows.push({ format: formatEl.value, data: raw });
      } else {
        const rowFormat = raw.slice(0, firstComma).trim().toUpperCase();
        const rowData = raw.slice(firstComma + 1).trim();
        rows.push({ format: rowFormat || formatEl.value, data: rowData });
      }
    }

    return rows;
  }

  function barcodeToPngDataUrl(text, format, widthPx, heightPx) {
    const mappedFormat = FORMAT_TO_JSBARCODE[format] || format;
    const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    window.JsBarcode(tempSvg, text, {
      format: mappedFormat,
      lineColor: lineColorEl.value,
      background: bgColorEl.value,
      width: Math.max(1, Math.round((Number(barWidthEl.value) || 2) * (widthPx / 180))),
      height: heightPx,
      margin: 4,
      displayValue: false
    });

    return new Promise((resolve, reject) => {
      const svgString = new XMLSerializer().serializeToString(tempSvg);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || widthPx;
        canvas.height = img.height || heightPx;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = bgColorEl.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to render ${format} barcode.`));
      };

      img.src = url;
    });
  }

  async function qrToPngDataUrl(text, widthPx) {
    const qr = createQrModel(text);
    const canvas = document.createElement("canvas");
    drawQrToCanvas(qr, canvas, widthPx);
    return canvas.toDataURL("image/png");
  }

  function applyLabelDimensions() {
    const width = Math.max(20, Number(labelWidthEl.value) || 45);
    const height = Math.max(15, Number(labelHeightEl.value) || 25);
    labelSheetEl.style.setProperty("--label-width", `${width}mm`);
    labelSheetEl.style.setProperty("--label-height", `${height}mm`);
  }

  async function generateBatchSheet() {
    if (!window.qrcode || !window.JsBarcode) {
      setBatchStatus("Loading barcode libraries...", "success");
      const loaded = await ensureLibrariesLoaded();
      if (!loaded) {
        setBatchStatus("Libraries failed to load. Check internet/CDN access and refresh.", "error");
        return;
      }
    }

    const rows = parseCsvRows(batchInputEl.value);
    if (!rows.length) {
      setBatchStatus("Paste CSV rows or upload a CSV file first.", "error");
      return;
    }

    labelSheetEl.innerHTML = "";
    labelSheetEl.classList.remove("empty");
    applyLabelDimensions();

    let successCount = 0;
    const failures = [];
    const labelWidthMm = Math.max(20, Number(labelWidthEl.value) || 45);
    const labelHeightMm = Math.max(15, Number(labelHeightEl.value) || 25);
    const widthPx = Math.round(labelWidthMm * 3.2);
    const heightPx = Math.round(labelHeightMm * 3.2);

    for (const row of rows) {
      const normalized = normalizeCodeValue(row.format, row.data);
      if (!normalized.ok) {
        failures.push(`${row.format}: ${normalized.message}`);
        continue;
      }

      try {
        const imgSrc = row.format === "QR"
          ? await qrToPngDataUrl(normalized.value, Math.max(widthPx, heightPx))
          : await barcodeToPngDataUrl(normalized.value, row.format, widthPx, Math.max(70, heightPx - 24));

        const item = document.createElement("article");
        item.className = "label-item";

        const img = document.createElement("img");
        img.src = imgSrc;
        img.alt = `${row.format} label`;

        const caption = document.createElement("small");
        caption.textContent = `${row.format}: ${normalized.value}`;

        item.appendChild(img);
        item.appendChild(caption);
        labelSheetEl.appendChild(item);
        successCount += 1;
      } catch (error) {
        failures.push(`${row.format}: ${error.message}`);
      }
    }

    if (!successCount) {
      labelSheetEl.classList.add("empty");
      setBatchStatus(`No labels generated. ${failures[0] || "Check CSV values."}`, "error");
      return;
    }

    if (failures.length) {
      setBatchStatus(
        `Generated ${successCount} labels. ${failures.length} rows skipped due to validation.`,
        "error"
      );
    } else {
      setBatchStatus(`Generated ${successCount} labels for printing.`);
    }

    trackEvent("batchGenerates");
  }

  function downloadCsvTemplate() {
    const content = [
      "format,data",
      "QR,https://example.com",
      "EAN13,5901234123457",
      "UPCA,036000291452",
      "CODE128,OB-ORDER-1001"
    ].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, "batch-template.csv");
  }

  function loadExampleCsv() {
    if (!batchInputEl) {
      return;
    }

    batchInputEl.value = [
      "format,data",
      "QR,https://example.com",
      "CODE128,OB-ORDER-1001",
      "EAN13,5901234123457",
      "UPCA,036000291452"
    ].join("\n");

    setBatchStatus("Example CSV loaded. Click Generate Label Sheet.");
  }

  function clearBatch() {
    batchInputEl.value = "";
    labelSheetEl.innerHTML = "";
    labelSheetEl.classList.add("empty");
    setBatchStatus("Label sheet cleared.");
  }

  function updateFormatHint() {
    if (!formatHintEl) {
      return;
    }

    formatHintEl.textContent = hintByFormat(formatEl.value);
  }

  function initCsvUpload() {
    if (!csvFileEl || !batchInputEl) {
      return;
    }

    csvFileEl.addEventListener("change", async () => {
      const file = csvFileEl.files && csvFileEl.files[0];
      if (!file) {
        return;
      }

      try {
        batchInputEl.value = await file.text();
        setBatchStatus("CSV loaded. Click Generate Label Sheet.");
      } catch (_error) {
        setBatchStatus("Unable to read CSV file.", "error");
      }
    });
  }

  function isAdSafeDistance(slot, minDistance, protectedElements) {
    const slotRect = slot.getBoundingClientRect();

    for (const target of protectedElements) {
      const targetRect = target.getBoundingClientRect();
      const horizontalGap = Math.max(
        0,
        Math.max(targetRect.left - slotRect.right, slotRect.left - targetRect.right)
      );
      const verticalGap = Math.max(
        0,
        Math.max(targetRect.top - slotRect.bottom, slotRect.top - targetRect.bottom)
      );

      if (horizontalGap < minDistance && verticalGap < minDistance) {
        return false;
      }
    }

    return true;
  }

  function initGuardedAds() {
    const adSlots = document.querySelectorAll(".guarded-ad");
    const protectedElements = [
      document.querySelector(".controls-card .actions"),
      document.getElementById("previewFrame")
    ].filter(Boolean);

    const consentChoice = localStorage.getItem("obConsentChoice");
    if (consentChoice === "reject") {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.requestNonPersonalizedAds = 1;
    } else {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.requestNonPersonalizedAds = 0;
    }

    const evaluateAdSlots = () => {
      adSlots.forEach((slot) => {
        const adNote = slot.querySelector(".ad-note");
        const adElement = slot.querySelector(".adsbygoogle");
        const minDistance = Number(slot.dataset.minDistance || "120");
        const configuredSlotId = slot.dataset.slotId || "";

        if (!adElement) {
          return;
        }

        if (!/^\d{10}$/.test(configuredSlotId)) {
          adElement.style.display = "none";
          slot.classList.add("ad-paused");
          if (adNote) {
            adNote.textContent = "Add a real AdSense ad slot ID to enable this placement.";
            adNote.classList.add("warn");
          }
          return;
        }

        const safeDistance = isAdSafeDistance(slot, minDistance, protectedElements);
        if (!safeDistance) {
          adElement.style.display = "none";
          slot.classList.add("ad-paused");
          if (adNote) {
            adNote.textContent = "Ad paused by safe-distance guard during resize/orientation changes.";
            adNote.classList.add("warn");
          }
          return;
        }

        slot.classList.remove("ad-paused");
        adElement.style.display = "block";
        adElement.dataset.adSlot = configuredSlotId;

        if (!adElement.dataset.obAdPushed) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            adElement.dataset.obAdPushed = "1";
          } catch (_error) {
            if (adNote) {
              adNote.textContent = "Ad initialization skipped. Confirm AdSense account and slot settings.";
              adNote.classList.add("warn");
            }
          }
        }
      });
    };

    evaluateAdSlots();

    window.addEventListener("resize", () => {
      if (adsReflowTimer) {
        clearTimeout(adsReflowTimer);
      }
      adsReflowTimer = setTimeout(evaluateAdSlots, 180);
    });

    window.addEventListener("orientationchange", () => {
      setTimeout(evaluateAdSlots, 200);
    });
  }

  function initPwa() {
    if (!installBtn) {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        setStatus("Service worker registration failed.", "error");
      });
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installBtn.classList.remove("hidden");
    });

    installBtn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        setStatus("Install prompt is not available yet.", "error");
        return;
      }

      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.classList.add("hidden");
    });

    window.addEventListener("appinstalled", () => {
      setStatus("App installed successfully.");
      installBtn.classList.add("hidden");
    });
  }

  function applyPreset(type) {
    if (type === "url") {
      formatEl.value = "QR";
      dataEl.value = "https://example.com";
    }

    if (type === "wifi") {
      formatEl.value = "QR";
      dataEl.value = "WIFI:T:WPA;S:OfficeWiFi;P:StrongPassword123;;";
    }

    if (type === "ean") {
      formatEl.value = "EAN13";
      dataEl.value = "5901234123457";
    }

    if (type === "upc") {
      formatEl.value = "UPCA";
      dataEl.value = "036000291452";
    }

    generateCode({ manual: true });
  }

  function initSavedPresets() {
    if (!savePresetBtn || !savedPresetsEl || !loadPresetBtn || !deletePresetBtn) {
      return;
    }

    renderSavedPresets();
    renderRecentCodes();

    savePresetBtn.addEventListener("click", () => {
      const name = (presetNameEl && presetNameEl.value.trim()) || "Untitled preset";
      const state = collectCurrentState();
      if (!state.data) {
        setStatus("Enter data before saving a preset.", "error");
        return;
      }

      const presets = loadPresets();
      presets.push({
        id: `${Date.now()}`,
        name,
        state
      });
      savePresets(presets.slice(-30));
      renderSavedPresets();
      if (presetNameEl) {
        presetNameEl.value = "";
      }
      showToast("Preset saved");
    });

    loadPresetBtn.addEventListener("click", () => {
      const id = savedPresetsEl.value;
      if (!id) {
        setStatus("Select a preset to load.", "error");
        return;
      }

      const preset = loadPresets().find((item) => item.id === id);
      if (!preset) {
        setStatus("Preset not found.", "error");
        return;
      }

      applySavedState(preset.state);
      setStatus(`Preset loaded: ${preset.name}`);
    });

    deletePresetBtn.addEventListener("click", () => {
      const id = savedPresetsEl.value;
      if (!id) {
        setStatus("Select a preset to delete.", "error");
        return;
      }

      const presets = loadPresets();
      const next = presets.filter((item) => item.id !== id);
      savePresets(next);
      renderSavedPresets();
      setStatus("Preset deleted.");
    });
  }

  function initWorkflowShortcuts() {
    window.addEventListener("keydown", (event) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        generateCode({ manual: true });
        return;
      }

      if (event.key.toLowerCase() === "d" && event.shiftKey) {
        event.preventDefault();
        downloadSvg();
        return;
      }

      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        downloadPng();
      }
    });
  }

  function runDeploymentChecks() {
    if (!checksOutputEl) {
      return;
    }

    checksOutputEl.innerHTML = "";

    addCheckResult(window.JsBarcode ? "Barcode library ready." : "Barcode library missing.", window.JsBarcode ? "ok" : "error");
    addCheckResult(window.qrcode ? "QR library ready." : "QR library missing.", window.qrcode ? "ok" : "error");
    addCheckResult(window.JSZip ? "ZIP export library ready." : "ZIP export library not preloaded (loads on demand).", window.JSZip ? "ok" : "warn");
    addCheckResult("Manifest detected.", document.querySelector('link[rel="manifest"]') ? "ok" : "error");
    addCheckResult("Service Worker support available.", "serviceWorker" in navigator ? "ok" : "warn");
    addCheckResult("Secure context for install features.", window.isSecureContext ? "ok" : "warn");

    const adSlots = Array.from(document.querySelectorAll(".guarded-ad"));
    const adSlotValidity = adSlots.every((slot) => /^\d{10}$/.test(slot.dataset.slotId || ""));
    addCheckResult(
      adSlotValidity ? "Ad slot IDs are configured." : "One or more ad slot IDs are invalid.",
      adSlotValidity ? "ok" : "error"
    );

    const consentConfigured = Boolean(localStorage.getItem("obConsentChoice"));
    addCheckResult(
      consentConfigured ? "Consent choice captured for this browser." : "No consent choice stored yet.",
      consentConfigured ? "ok" : "warn"
    );

    const warnings = scannerConfidenceWarnings();
    addCheckResult(
      warnings.length ? `Scanner confidence warnings: ${warnings.length}` : "Scanner confidence looks good for current settings.",
      warnings.length ? "warn" : "ok"
    );
  }

  function isDevMode() {
    try {
      const loc = window.location;
      if (loc.hostname === "localhost" || loc.hostname === "127.0.0.1") return true;
      if (loc.protocol === "file:") return true;
      if (/\bdev=1\b/.test(loc.search)) return true;
    } catch (_) {}
    return false;
  }

  function initDeploymentChecks() {
    const checksCard = document.querySelector('.checks-card');
    if (!isDevMode()) {
      if (checksCard) checksCard.style.display = 'none';
      return;
    }
    if (!runChecksBtn) {
      return;
    }
    runChecksBtn.addEventListener("click", runDeploymentChecks);
  }

  function resetForm() {
    form.reset();
    formatEl.value = "QR";
    dataEl.value = "https://example.com";
    lineColorEl.value = "#111111";
    bgColorEl.value = "#ffffff";
    marginEl.value = "8";
    barWidthEl.value = "2";
    barHeightEl.value = "100";
    showTextEl.checked = true;
    qrEcEl.value = "M";
    setStatus("Reset to defaults.");
    generateCode({ manual: true });
  }

  function initConsentBanner() {
    const choice = localStorage.getItem("obConsentChoice");

    if (!choice) {
      consentBanner.classList.remove("hidden");
    }

    consentAccept.addEventListener("click", () => {
      localStorage.setItem("obConsentChoice", "accept");
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.requestNonPersonalizedAds = 0;
      consentBanner.classList.add("hidden");
      setStatus("Consent saved: personalized ads allowed. Refresh page to apply ad mode.");
    });

    consentReject.addEventListener("click", () => {
      localStorage.setItem("obConsentChoice", "reject");
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.requestNonPersonalizedAds = 1;
      consentBanner.classList.add("hidden");
      setStatus("Consent saved: non-personalized ads enabled. Refresh page to apply ad mode.");
    });
  }

  if (form) form.addEventListener("submit", generateCode);
  if (downloadPngBtn) downloadPngBtn.addEventListener("click", downloadPng);
  if (downloadSvgBtn) downloadSvgBtn.addEventListener("click", downloadSvg);
  if (copySvgBtn) copySvgBtn.addEventListener("click", copySvg);
  if (copyBtn) copyBtn.addEventListener("click", copyImage);
  if (resetBtn) resetBtn.addEventListener("click", resetForm);
  if (generateBatchBtn) generateBatchBtn.addEventListener("click", generateBatchSheet);
  if (downloadBatchZipBtn) downloadBatchZipBtn.addEventListener("click", downloadBatchZip);
  if (printLabelsBtn) printLabelsBtn.addEventListener("click", () => window.print());
  if (clearBatchBtn) clearBatchBtn.addEventListener("click", clearBatch);
  if (downloadTemplateBtn) downloadTemplateBtn.addEventListener("click", downloadCsvTemplate);
  if (loadExampleCsvBtn) loadExampleCsvBtn.addEventListener("click", loadExampleCsv);
  if (labelWidthEl) labelWidthEl.addEventListener("change", applyLabelDimensions);
  if (labelHeightEl) labelHeightEl.addEventListener("change", applyLabelDimensions);

  document.querySelectorAll(".preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyPreset(btn.dataset.preset);
    });
  });

  // Regenerate immediately when key controls change.
  [formatEl, qrEcEl, lineColorEl, bgColorEl, marginEl, barWidthEl, barHeightEl, showTextEl].forEach((el) => {
    el.addEventListener("change", () => {
      if (el === formatEl) {
        const selected = formatEl.value;
        const current = dataEl.value.trim();
        const validForFormat = !validateInput(selected, current);
        if (!current || !validForFormat) {
          dataEl.value = defaultValueByFormat(selected);
        }

        updateFormatHint();
      }

      if (dataEl.value.trim()) {
        generateCode();
      }
    });
  });

  if (dataEl) {
    dataEl.addEventListener("input", () => {
      const masked = applyInputMask(dataEl.value, formatEl.value);
      if (masked !== dataEl.value) {
        dataEl.value = masked;
      }

      const inlineError = validateInput(formatEl.value, dataEl.value);
      setInlineValidation(inlineError || "", inlineError ? "error" : "ok");

      if (typingTimer) {
        clearTimeout(typingTimer);
      }

      typingTimer = setTimeout(() => {
        if (dataEl.value.trim()) {
          generateCode();
        }
      }, 220);
    });
  }

  initConsentBanner();
  initAnalytics();
  initTheme();
  initSavedPresets();
  initWorkflowShortcuts();
  initDeploymentChecks();
  initCsvUpload();
  initGuardedAds();
  initPwa();
  if (labelSheetEl) {
    applyLabelDimensions();
    labelSheetEl.classList.add("empty");
  }
  dataEl.value = "https://example.com";
  if (batchInputEl) {
    batchInputEl.value = "format,data\nQR,https://example.com\nEAN13,5901234123457\nUPCA,036000291452";
  }

  updateFormatHint();
  renderRecentCodes();

  ensureLibrariesLoaded().finally(() => {
    generateCode();
  });
})();
