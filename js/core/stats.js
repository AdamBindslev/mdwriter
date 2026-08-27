/**
 * MD Writer - Core Stats Module
 * Calculates word counts, characters, line counts, and estimated reading time.
 */

(function () {
  window.MDCore = window.MDCore || {};

  /**
   * Calculate text statistics from string
   */
  function calculateStats(text = '') {
    const rawText = text || '';
    const trimmed = rawText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = rawText.length;
    const lines = rawText ? rawText.split('\n').length : 0;
    const readTimeMins = Math.ceil(words / 200);

    return {
      words,
      chars,
      lines,
      readTimeMins
    };
  }

  /**
   * Format stats into Danish human-readable strings
   */
  function formatStats(stats) {
    const words = stats.words || 0;
    const chars = stats.chars || 0;
    const lines = stats.lines || 0;
    const readTimeMins = stats.readTimeMins || 1;

    return {
      wordsText: `${words} ord`,
      charsText: `${chars} tegn`,
      linesText: `${lines} linjer`,
      readTimeText: readTimeMins <= 1 ? '< 1 min læsetid' : `ca. ${readTimeMins} min læsetid`
    };
  }

  /**
   * Helper to update stat DOM elements if provided
   */
  function updateStatsUI({ text = '', wordsEl = null, charsEl = null, linesEl = null, readTimeEl = null }) {
    const stats = calculateStats(text);
    const formatted = formatStats(stats);

    if (wordsEl) wordsEl.textContent = formatted.wordsText;
    if (charsEl) charsEl.textContent = formatted.charsText;
    if (linesEl) linesEl.textContent = formatted.linesText;
    if (readTimeEl) readTimeEl.textContent = formatted.readTimeText;

    return stats;
  }

  window.MDCore.Stats = {
    calculateStats,
    formatStats,
    updateStatsUI
  };
})();
