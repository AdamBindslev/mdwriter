/**
 * MD Writer - Core Storage & State Module
 * Handles draft persistence across localStorage, sessionStorage and URL parameters,
 * as well as date formatting, filename sanitization and markdown structure assembly.
 */

(function () {
  window.MDCore = window.MDCore || {};

  const DRAFT_KEY = 'md_writer_draft';

  const sampleData = {
    title: 'Feltdagbog: Vandring ved Møns Klint',
    categories: 'Dato: 14. august 2026 | Sted: Møns Klint, Danmark | Tags: feltarbejde, dagbog',
    body: `Tågen lå tæt over kridtskrænterne i morges, da jeg startede turen ned ad trapperne mod stranden. Det føles som et helt andet landskab, når Østersøen viser tænder og gråtonerne dominerer horisonten.

## Observationer i felten
- Vinden kom fra sydøst med ca. 12 m/s.
- Kridtlaget var glat, og flere mindre skred var sket i løbet af natten.
- Bølgerne skyllede helt op mod klintefoden.

> "Der er noget grundlæggende beroligende ved at stå foran kridtformationer, der har været her i 70 millioner år. Man bliver mindet om sin egen flygtighed."

Vi nåede helt ud til Liselund før regnen satte ind. Kameraet var pakket ind i voksdug, men jeg nåede at fange et par eksponeringer på Tri-X 400 før linsen duggede til.

### Udstyr anvendt
1. Mechanical 35mm Rangefinder
2. Kodak Tri-X 400 (fremkaldt i D-76, 1:1)
3. 35mm f/2.0 objektiv med gult filter

I aften står den på tørring af støvler og notatskrivning ved petroleumslampen.`
  };

  /**
   * Format Today's Date into YYMMDD format (e.g. 2026-08-14 -> 260814)
   */
  function getYYMMDD(date = new Date()) {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }

  /**
   * Format Danish Human Readable Date string (e.g. "14. august 2026")
   */
  function getFormattedDanishDate(date = new Date()) {
    const months = [
      'januar', 'februar', 'marts', 'april', 'maj', 'juni',
      'juli', 'august', 'september', 'oktober', 'november', 'december'
    ];
    return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Sanitize title for file system naming
   */
  function sanitizeFilename(title) {
    if (!title || !title.trim()) return 'dokument';
    let clean = title.trim();
    clean = clean.replace(/[\/\\:*?"<>|]/g, '');
    clean = clean.replace(/\s+/g, ' ');
    return clean;
  }

  /**
   * Calculate Export Filename: yymmdd titel.ext
   */
  function getExportFilename(title, ext = 'md') {
    const dateStr = getYYMMDD();
    const titleStr = sanitizeFilename(title);
    return `${dateStr} ${titleStr}.${ext.replace(/^\./, '')}`;
  }

  /**
   * Full Markdown Generator: Combines Title (#), Categories (*...*), and Body Text
   */
  function generateFullMarkdown(title = '', categories = '', body = '') {
    const trimmedTitle = (title || '').trim();
    const trimmedCategories = (categories || '').trim();
    const bodyContent = body || '';

    let fullMarkdown = '';
    if (trimmedTitle) {
      fullMarkdown += `# ${trimmedTitle}\n\n`;
    }
    if (trimmedCategories) {
      fullMarkdown += `*${trimmedCategories}*\n\n`;
    }
    fullMarkdown += bodyContent;
    return fullMarkdown;
  }

  /**
   * Save draft object to storage
   */
  function saveDraft({ title = '', categories = '', body = '' }) {
    const draft = {
      title,
      categories,
      body,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Draft save failed:', e);
    }
    return draft;
  }

  /**
   * Load draft checking URL -> sessionStorage -> localStorage
   */
  function loadDraft() {
    let draft = null;

    // 1. Check URL query parameters (?draft=...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const draftParam = urlParams.get('draft');
      if (draftParam) {
        draft = JSON.parse(decodeURIComponent(draftParam));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}

    // 2. Check sessionStorage
    if (!draft) {
      try {
        const savedSession = sessionStorage.getItem(DRAFT_KEY);
        if (savedSession) draft = JSON.parse(savedSession);
      } catch (e) {}
    }

    // 3. Check localStorage
    if (!draft) {
      try {
        const savedLocal = localStorage.getItem(DRAFT_KEY);
        if (savedLocal) draft = JSON.parse(savedLocal);
      } catch (e) {}
    }

    if (draft) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {}
    }

    return draft;
  }

  /**
   * Clear saved draft
   */
  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
  }

  /**
   * Seamless navigation to other theme/edition while passing draft state
   */
  function navigateWithDraft(targetUrl, draftData) {
    if (draftData) {
      saveDraft(draftData);
    }
    const current = loadDraft() || draftData || { title: '', categories: '', body: '' };
    const encoded = encodeURIComponent(JSON.stringify(current));
    window.location.href = `${targetUrl}?draft=${encoded}`;
  }

  /**
   * Parse an imported Markdown file content into Title, Categories, and Body
   */
  function parseAndLoadMdFile(fileName, content) {
    const lines = (content || '').split('\n');
    let title = '';
    let categories = '';
    let bodyLines = [];
    let lineIdx = 0;

    // Check if line 1 is H1 title (# Title)
    if (lines.length > 0 && lines[0].startsWith('# ')) {
      title = lines[0].substring(2).trim();
      lineIdx++;
      if (lineIdx < lines.length && lines[lineIdx].trim() === '') {
        lineIdx++;
      }
    } else {
      title = (fileName || 'dokument').replace(/\.md$/i, '');
    }

    // Check if next non-empty line is metadata in asterisks (*Dato: ...*)
    if (lineIdx < lines.length && lines[lineIdx].trim().startsWith('*') && lines[lineIdx].trim().endsWith('*')) {
      categories = lines[lineIdx].trim().slice(1, -1).trim();
      lineIdx++;
      if (lineIdx < lines.length && lines[lineIdx].trim() === '') {
        lineIdx++;
      }
    }

    bodyLines = lines.slice(lineIdx);

    return {
      title,
      categories,
      body: bodyLines.join('\n')
    };
  }

  window.MDCore.Storage = {
    DRAFT_KEY,
    sampleData,
    getYYMMDD,
    getFormattedDanishDate,
    sanitizeFilename,
    getExportFilename,
    generateFullMarkdown,
    saveDraft,
    loadDraft,
    clearDraft,
    navigateWithDraft,
    parseAndLoadMdFile
  };
})();
