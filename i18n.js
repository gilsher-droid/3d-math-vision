(function () {
  "use strict";

  const STORAGE_KEY = "spatialVisionLanguage";
  const dictionary = window.SPATIAL_TRANSLATIONS || {};
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const observedAttributes = ["title", "aria-label", "placeholder", "content"];
  let currentLanguage = "he";
  let applying = false;

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function translated(value) {
    const normalized = normalize(value);
    if (!normalized) return value;
    if (dictionary[normalized]) return dictionary[normalized];

    let result = normalized;
    Object.keys(dictionary)
      .sort(function (a, b) { return b.length - a.length; })
      .forEach(function (source) {
        if (result.includes(source)) result = result.split(source).join(dictionary[source]);
      });
    return result;
  }

  function translateTextNode(node) {
    if (node.parentElement && node.parentElement.closest("[data-i18n-fixed]")) return;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const source = originalText.get(node);
    if (!normalize(source)) return;
    node.nodeValue = currentLanguage === "ar" ? translated(source) : source;
  }

  function translateAttributes(element) {
    if (element.closest("[data-i18n-fixed]")) return;
    if (!originalAttributes.has(element)) originalAttributes.set(element, {});
    const originals = originalAttributes.get(element);
    observedAttributes.forEach(function (name) {
      if (!element.hasAttribute(name)) return;
      if (!(name in originals)) originals[name] = element.getAttribute(name);
      const source = originals[name];
      element.setAttribute(name, currentLanguage === "ar" ? translated(source) : source);
    });
  }

  function translateTree(root) {
    applying = true;
    const ownerDocument = root.ownerDocument || root;
    const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|NOSCRIPT)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest("[data-i18n-fixed]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
    root.querySelectorAll("[title], [aria-label], [placeholder], meta[content]").forEach(translateAttributes);
    applying = false;
  }

  function updateLinks() {
    document.querySelectorAll("a[href]").forEach(function (link) {
      const raw = link.getAttribute("href");
      if (!raw || raw.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(raw)) return;
      let url;
      try { url = new URL(raw, window.location.href); } catch (_) { return; }
      if (url.origin !== window.location.origin || !/\.html$/i.test(url.pathname)) return;
      url.searchParams.set("lang", currentLanguage);
      link.href = url.pathname + url.search + url.hash;
    });
  }

  function updateControls() {
    document.querySelectorAll("[data-set-language]").forEach(function (button) {
      const active = button.dataset.setLanguage === currentLanguage;
      button.textContent = button.dataset.setLanguage === "ar" ? "العربية" : "עברית";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-current-language]").forEach(function (element) {
      element.textContent = currentLanguage === "ar" ? "🌐 العربية ▾" : "🌐 עברית ▾";
    });
  }

  function createSwitcher() {
    const script = document.currentScript;
    if (!script || script.dataset.showSwitcher !== "true" || document.querySelector(".spatial-language-switcher")) return;
    const controls = document.createElement("div");
    controls.className = "spatial-language-switcher";
    controls.setAttribute("aria-label", "בחירת שפה");
    controls.innerHTML = '<button type="button" data-set-language="he">עברית</button><button type="button" data-set-language="ar">العربية</button>';
    document.body.appendChild(controls);
  }

  function setLanguage(language, options) {
    currentLanguage = language === "ar" ? "ar" : "he";
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = "rtl";
    if (!options || options.persist !== false) localStorage.setItem(STORAGE_KEY, currentLanguage);
    translateTree(document.documentElement);
    updateControls();
    updateLinks();
    document.dispatchEvent(new CustomEvent("spatial:languagechange", { detail: { lang: currentLanguage } }));
  }

  function preferredLanguage() {
    const query = new URLSearchParams(window.location.search).get("lang");
    if (query === "he" || query === "ar") return query;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "ar" ? "ar" : "he";
  }

  createSwitcher();
  document.addEventListener("click", function (event) {
    const control = event.target.closest("[data-set-language]");
    if (control) setLanguage(control.dataset.setLanguage);
  });

  const observer = new MutationObserver(function (records) {
    if (applying) return;
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        if (node.nodeType === Node.ELEMENT_NODE) translateTree(node);
      });
    });
  });

  window.SpatialVisionI18n = {
    setLanguage: setLanguage,
    getLanguage: function () { return currentLanguage; },
    translateRoot: translateTree,
  };
  setLanguage(preferredLanguage(), { persist: false });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
