(function () {
  "use strict";

  const script = document.currentScript;
  const portalHref = script && script.dataset.portalHref;
  const sessionNote = script && script.dataset.sessionNote;
  const storageKey = "spatialVisionLanguage";

  const COPY = {
    he: {
      back: "חזרה לפורטל",
      backLabel: "חזרה לפורטל Spatial Vision",
      session: "שימו לב: ההתקדמות נשמרת בדף הנוכחי בלבד ותימחק לאחר רענון או סגירה.",
      cell: (row, column, value) => `תא בשורה ${row}, עמודה ${column}${value ? `, ערך ${value}` : ""}`,
    },
    ar: {
      back: "العودة إلى البوابة",
      backLabel: "العودة إلى بوابة Spatial Vision",
      session: "تنبيه: يُحفَظ التقدّم في الصفحة الحالية فقط، وسيُحذف عند تحديث الصفحة أو إغلاقها.",
      cell: (row, column, value) => `خانة في الصفّ ${row}، العمود ${column}${value ? `، القيمة ${value}` : ""}`,
    },
  };

  function language() {
    return document.documentElement.lang === "ar" ? "ar" : "he";
  }

  function preferredLanguage() {
    const query = new URLSearchParams(window.location.search).get("lang");
    if (query === "he" || query === "ar") return query;
    return localStorage.getItem(storageKey) === "ar" ? "ar" : "he";
  }

  function persistLanguage(lang) {
    localStorage.setItem(storageKey, lang === "ar" ? "ar" : "he");
  }

  function activateNativeLanguage(lang) {
    if (language() === lang) return;
    const direct = document.querySelector('[data-lang="' + lang + '"]')
      || document.getElementById(lang === "ar" ? "btnAr" : "btnHe")
      || document.getElementById("lang-" + lang);
    if (direct) { direct.click(); return; }
    const toggle = document.querySelector(".lang-toggle-btn, #lang-toggle, #langBtn");
    if (toggle) toggle.click();
  }

  function positionInGrid(element) {
    const row = element.closest("tr, [role='row']");
    const grid = element.closest("table, [role='grid'], .grid, .num-grid");
    if (!grid) return null;

    const rows = Array.from(grid.querySelectorAll(":scope > tbody > tr, :scope > tr, [role='row']"));
    const rowIndex = row ? rows.indexOf(row) : -1;
    const siblings = row
      ? Array.from(row.querySelectorAll("td, th, [role='gridcell'], button, .cell, .num-cell"))
      : Array.from(grid.querySelectorAll(":scope > .cell, :scope > .num-cell, :scope > button"));
    const columnIndex = siblings.indexOf(element);

    if (rowIndex < 0 && columnIndex >= 0) {
      const computedColumns = window.getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
      const columnCount = Number(grid.dataset.cols) || computedColumns || siblings.length;
      return {
        row: Math.floor(columnIndex / columnCount) + 1,
        column: (columnIndex % columnCount) + 1,
      };
    }
    if (rowIndex < 0 && columnIndex < 0) return null;
    return {
      row: Number(element.dataset.r ?? element.dataset.row ?? rowIndex) + 1,
      column: Number(element.dataset.c ?? element.dataset.col ?? columnIndex) + 1,
    };
  }

  function describeInteractiveCell(element) {
    const position = positionInGrid(element);
    const value = (element.textContent || element.getAttribute("value") || "").trim();
    if (!position || !Number.isFinite(position.row) || !Number.isFinite(position.column)) return;
    element.setAttribute("aria-label", COPY[language()].cell(position.row, position.column, value));
  }

  function makeKeyboardAccessible(element) {
    if (!element.hasAttribute("role")) element.setAttribute("role", "button");
    if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "0");
    if (element.dataset.keyboardReady === "true") return;
    element.dataset.keyboardReady = "true";
    element.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      element.click();
    });
  }

  function enhance(root) {
    const scope = root && root.querySelectorAll ? root : document;

    scope.querySelectorAll("div[onclick], span[onclick], .num-cell, .cell[onclick]").forEach(function (element) {
      makeKeyboardAccessible(element);
      describeInteractiveCell(element);
    });

    scope.querySelectorAll("button").forEach(function (button) {
      const text = (button.textContent || "").trim();
      if (/^\d+$/.test(text) && !button.hasAttribute("aria-label")) describeInteractiveCell(button);
    });

    scope.querySelectorAll(".feedback, .result, .incomplete-note, [class*='feedback']").forEach(function (element) {
      if (!element.hasAttribute("role")) element.setAttribute("role", "status");
      if (!element.hasAttribute("aria-live")) element.setAttribute("aria-live", "polite");
    });
  }

  function addPortalLink() {
    if (!portalHref || document.querySelector(".portal-back-link")) return;
    const link = document.createElement("a");
    link.className = "portal-back-link";
    const target = new URL(portalHref, window.location.href);
    target.searchParams.set("lang", language());
    link.href = target.pathname + target.search + target.hash;
    document.body.appendChild(link);
    refreshShellCopy();
  }

  function addSessionNote() {
    if (sessionNote === "false" || document.querySelector(".lab-session-note")) return;
    const note = document.createElement("p");
    note.className = "lab-session-note";
    document.body.appendChild(note);
    refreshShellCopy();
  }

  function refreshShellCopy() {
    const copy = COPY[language()];
    const link = document.querySelector(".portal-back-link");
    const note = document.querySelector(".lab-session-note");
    if (link) {
      link.textContent = copy.back;
      link.setAttribute("aria-label", copy.backLabel);
      const target = new URL(portalHref, window.location.href);
      target.searchParams.set("lang", language());
      link.href = target.pathname + target.search + target.hash;
    }
    if (note) note.textContent = copy.session;
    document.querySelectorAll("div[onclick], span[onclick], .num-cell, .cell[onclick]").forEach(describeInteractiveCell);
  }

  function refreshLanguageControls() {
    document.querySelectorAll("[id*='btnHe'], [id*='btnAr'], .lang-toggle-btn, .lang-btn, .langtog button").forEach(function (button) {
      const isActive = button.classList.contains("active");
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    enhance(document);
    addPortalLink();
    addSessionNote();
    refreshLanguageControls();
    document.addEventListener("lab:languagechange", function () {
      persistLanguage(language());
      refreshShellCopy();
      refreshLanguageControls();
    });
    document.addEventListener("spatial:languagechange", function () {
      persistLanguage(language());
      refreshShellCopy();
      refreshLanguageControls();
    });

    window.setTimeout(function () {
      activateNativeLanguage(preferredLanguage());
      refreshShellCopy();
      refreshLanguageControls();
    }, 0);

    const observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) enhance(node);
        });
      });
      refreshLanguageControls();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
