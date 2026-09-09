(() => {
  "use strict";
  const root = document.documentElement;
  let language = "en";
  try {
    if (localStorage.getItem("site-language") === "zh") language = "zh";
  } catch (_) {
    /* Storage may be disabled. */
  }
  function applyLanguage() {
    root.dataset.language = language;
    root.lang = language === "zh" ? "zh-CN" : "en";
    const button = document.getElementById("language-toggle");
    if (button) {
      const label = language === "zh" ? "Switch to English" : "切换为中文";
      button.setAttribute("aria-label", label);
      button.title = label;
      button.querySelector("span").textContent = language === "zh" ? "EN / 中" : "中 / EN";
      button.hidden = false;
    }
  }
  applyLanguage();
  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();
    const button = document.getElementById("language-toggle");
    if (!button) return;
    button.addEventListener("click", () => {
      language = language === "en" ? "zh" : "en";
      applyLanguage();
      try {
        localStorage.setItem("site-language", language);
      } catch (_) {
        /* Switching still works without storage. */
      }
    });
  });
})();
