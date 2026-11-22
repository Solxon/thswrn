/* Persistence layer for theme and input values via localStorage */
const Storage = (function () {
  const THEME_KEY = 'oathsworn-theme';
  const VALID_THEMES = ['default', 'ember', 'ocean', 'forest', 'royal', 'crimson', 'slate', 'sand'];
  const STORAGE_KEYS = {
    difficulty: 'oathsworn-difficulty',
    modifier: 'oathsworn-modifier',
    rerolls: 'oathsworn-rerolls',
    yellow: 'oathsworn-dice-yellow',
    red: 'oathsworn-dice-red',
    black: 'oathsworn-dice-black'
  };

  function saveTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }

  function loadTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved && VALID_THEMES.includes(saved)) return saved;
    } catch (e) {}
    return 'default';
  }

  function saveInputValue(inputId, value) {
    try {
      localStorage.setItem(STORAGE_KEYS[inputId], String(value));
    } catch (e) {}
  }

  function loadInputValue(inputId, fallback) {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS[inputId]);
      if (saved !== null) {
        const num = Number(saved);
        if (!isNaN(num)) return num;
      }
    } catch (e) {}
    return fallback;
  }

  return {
    VALID_THEMES,
    saveTheme,
    loadTheme,
    saveInputValue,
    loadInputValue
  };
})();