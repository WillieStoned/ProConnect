// theme.js - load first to avoid flash of wrong theme
(function () {
  const STORAGE_KEY = 'pc_theme';
  const THEMES = new Set(['dark', 'light']);
  const SUN_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.5"></circle>
      <path d="M12 2.5v2.25M12 19.25v2.25M4.75 12H2.5M21.5 12h-2.25M5.76 5.76 4.17 4.17M19.83 19.83l-1.59-1.59M18.24 5.76l1.59-1.59M4.17 19.83l1.59-1.59"></path>
    </svg>
  `;
  const MOON_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.2 14.1A8.5 8.5 0 1 1 9.9 3.8a7 7 0 1 0 10.3 10.3z"></path>
    </svg>
  `;

  function getStoredTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return THEMES.has(saved) ? saved : null;
    } catch {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures (privacy mode, restricted storage, etc.).
    }
  }

  function getSystemTheme() {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  }

  function resolveTheme(theme) {
    return THEMES.has(theme) ? theme : getSystemTheme();
  }

  function applyTheme(theme) {
    const resolved = resolveTheme(theme);
    document.documentElement.setAttribute('data-theme', resolved);
    return resolved;
  }

  function updateToggleIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', String(isDark));
      btn.innerHTML = isDark ? MOON_ICON : SUN_ICON;
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
    updateToggleIcon();
  }

  // Apply immediately to avoid flash of wrong theme.
  applyTheme(getStoredTheme() || getSystemTheme());

  // Expose globally for pages and main.js.
  window.toggleTheme = toggleTheme;
  window.updateToggleIcon = updateToggleIcon;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateToggleIcon, { once: true });
  } else {
    updateToggleIcon();
  }

  // Follow OS theme only when user has not explicitly chosen a theme.
  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = (event) => {
      if (getStoredTheme()) {
        return;
      }
      applyTheme(event.matches ? 'dark' : 'light');
      updateToggleIcon();
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onSystemThemeChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(onSystemThemeChange);
    }
  } catch {
    // Ignore media query failures.
  }
})();
