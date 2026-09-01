/**
 * Flowscribe - Core Storage & State Module
 * Handles draft persistence across localStorage, sessionStorage and URL parameters,
 * as well as date formatting, filename sanitization and markdown structure assembly.
 */

(function () {
  window.MDCore = window.MDCore || {};
  window.MDCore.VERSION = '2.4.0';

  console.log('%c🚀 Flowscribe Core v2.4.0 aktiv', 'background: #2563eb; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

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

  // Windows reserved device names
  const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

  /**
   * Sanitize title for file system naming across Windows, macOS, Linux and FAT32/exFAT
   */
  function sanitizeFilename(title) {
    if (!title || typeof title !== 'string') return 'dokument';
    let clean = title.trim();
    // Remove forbidden filesystem and control characters
    clean = clean.replace(/[\/\\:*?"<>|\x00-\x1f\x7f]/g, '');
    // Collapse multiple spaces
    clean = clean.replace(/\s+/g, ' ');
    // Remove trailing dots and spaces (problematic on Windows/FAT)
    clean = clean.replace(/[\s.]+$/, '');
    // Truncate length
    if (clean.length > 100) {
      clean = clean.slice(0, 100).trim().replace(/[\s.]+$/, '');
    }
    // Fallback if empty
    if (!clean) return 'dokument';
    // Protect against Windows reserved filenames
    if (WINDOWS_RESERVED.test(clean)) {
      clean = `doc_${clean}`;
    }
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
   * Save draft object to storage with separate try/catch and detailed status reporting
   */
  function saveDraft({ title = '', categories = '', body = '' }) {
    const draft = {
      title: title || '',
      categories: categories || '',
      body: body || '',
      updatedAt: Date.now()
    };
    let localOk = false;
    let sessionOk = false;
    let error = null;
    const jsonStr = JSON.stringify(draft);

    try {
      localStorage.setItem(DRAFT_KEY, jsonStr);
      localOk = true;
    } catch (e) {
      error = e;
      console.warn('localStorage draft save failed:', e);
    }

    try {
      sessionStorage.setItem(DRAFT_KEY, jsonStr);
      sessionOk = true;
    } catch (e) {
      if (!error) error = e;
      console.warn('sessionStorage draft save failed:', e);
    }

    return {
      ok: localOk || sessionOk,
      local: localOk,
      session: sessionOk,
      draft,
      error
    };
  }

  /**
   * Load draft checking URL -> sessionStorage -> localStorage
   */
  function loadDraft() {
    let draft = null;

    // 1. Check URL query parameters (?draft=...) if present
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const draftParam = urlParams.get('draft');
      if (draftParam) {
        draft = JSON.parse(decodeURIComponent(draftParam));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.warn('Could not parse URL draft param:', e);
    }

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
      } catch (e) {}
      try {
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
    } catch (e) {}
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
  }

  /**
   * Seamless navigation to other theme/edition while passing draft state reliably
   */
  function navigateWithDraft(targetUrl, draftData) {
    let saveResult = null;
    if (draftData) {
      saveResult = saveDraft(draftData);
    }

    // If storage is working, navigate directly without bloating the URL
    if (saveResult && saveResult.ok) {
      window.location.href = targetUrl;
      return;
    }

    // Fallback: If storage completely failed, only pass via URL if size is reasonable
    const current = draftData || loadDraft() || { title: '', categories: '', body: '' };
    try {
      const jsonStr = JSON.stringify(current);
      if (jsonStr.length < 2000) {
        const encoded = encodeURIComponent(jsonStr);
        window.location.href = `${targetUrl}?draft=${encoded}`;
        return;
      }
    } catch (e) {}

    // Total storage failure and document is too large for safe URL transfer:
    // Warn user to prevent silent data loss upon leaving page
    const confirmLeave = typeof window.confirm === 'function' ? window.confirm(
      'Advarsel: Dokumentet kan ikke gemmes i browserens lager (lageret er blokeret eller fuldt).\n\n' +
      'Hvis du fortsætter til en anden visning nu, vil de seneste ændringer i teksten gå tabt.\n\n' +
      'Eksportér venligst dit dokument først som .md-fil.\n\n' +
      'Vil du skifte visning alligevel?'
    ) : true;

    if (confirmLeave) {
      window.location.href = targetUrl;
    }
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
