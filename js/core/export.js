/**
 * Flowscribe - Core Export Module
 * Handles exporting documents to .md, .html, .txt, clipboard copy, and print/PDF triggering.
 */

(function () {
  window.MDCore = window.MDCore || {};

  /**
   * Helper to trigger browser download of a Blob
   */
  function downloadBlob(content, filename, mimeType = 'text/plain;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export as Markdown (.md)
   */
  function exportMarkdown(title, categories, body) {
    const Storage = window.MDCore.Storage;
    const content = Storage ? Storage.generateFullMarkdown(title, categories, body) : `${title}\n${categories}\n${body}`;
    const filename = Storage ? Storage.getExportFilename(title, 'md') : 'dokument.md';

    downloadBlob(content, filename, 'text/markdown;charset=utf-8;');
    return filename;
  }

  /**
   * Export as Plain Text (.txt)
   */
  function exportTxt(title, categories, body) {
    const Storage = window.MDCore.Storage;
    const content = Storage ? Storage.generateFullMarkdown(title, categories, body) : `${title}\n${categories}\n${body}`;
    const filename = Storage ? Storage.getExportFilename(title, 'txt') : 'dokument.txt';

    downloadBlob(content, filename, 'text/plain;charset=utf-8;');
    return filename;
  }

  /**
   * Escape HTML special characters for safe inclusion in HTML templates
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Export as a standalone HTML document (.html)
   */
  function exportHtml(title, categories, body, isDark = false) {
    const Storage = window.MDCore.Storage;
    const Markdown = window.MDCore.Markdown;
    const fullMd = Storage ? Storage.generateFullMarkdown(title, categories, body) : `${title}\n${categories}\n${body}`;
    const parsedContent = Markdown ? Markdown.parseToHtml(fullMd, { showReturnSymbols: false }) : fullMd;
    const docTitle = (title || 'Dokument').trim();
    const filename = Storage ? Storage.getExportFilename(title, 'html') : 'dokument.html';

    const htmlDoc = `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(docTitle)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: ${isDark ? '#e0e0e0' : '#222222'};
      background-color: ${isDark ? '#1a1a1a' : '#ffffff'};
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
    }
    h1, h2, h3, h4, h5, h6 {
      color: ${isDark ? '#ffffff' : '#111111'};
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 1rem;
      margin: 1.5rem 0;
      color: ${isDark ? '#aaaaaa' : '#555555'};
      font-style: italic;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9em;
      background: ${isDark ? '#2d2d2d' : '#f3f4f6'};
      padding: 0.2em 0.4em;
      border-radius: 4px;
    }
    pre code {
      display: block;
      padding: 1em;
      overflow-x: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1.5em 0;
    }
    th, td {
      border: 1px solid ${isDark ? '#444' : '#ddd'};
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: ${isDark ? '#2d2d2d' : '#f9fafb'};
    }
    img { max-width: 100%; height: auto; border-radius: 6px; }
  </style>
</head>
<body>
  ${parsedContent}
</body>
</html>`;

    downloadBlob(htmlDoc, filename, 'text/html;charset=utf-8;');
    return filename;
  }

  /**
   * Copy Markdown text to system clipboard
   */
  async function copyMarkdown(title, categories, body) {
    const Storage = window.MDCore.Storage;
    const content = Storage ? Storage.generateFullMarkdown(title, categories, body) : `${title}\n${categories}\n${body}`;
    await navigator.clipboard.writeText(content);
    return true;
  }

  /**
   * Copy rendered HTML to system clipboard
   */
  async function copyHtml(title, categories, body) {
    const Storage = window.MDCore.Storage;
    const Markdown = window.MDCore.Markdown;
    const fullMd = Storage ? Storage.generateFullMarkdown(title, categories, body) : `${title}\n${categories}\n${body}`;
    const parsedHtml = Markdown ? Markdown.parseToHtml(fullMd, { showReturnSymbols: false }) : fullMd;

    if (navigator.clipboard && window.ClipboardItem) {
      const type = 'text/html';
      const blob = new Blob([parsedHtml], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
    } else {
      await navigator.clipboard.writeText(parsedHtml);
    }
    return true;
  }

  /**
   * Trigger print / PDF export dialog
   */
  function triggerPdfPrint(renderCallback) {
    if (typeof renderCallback === 'function') {
      renderCallback();
    }
    window.print();
  }

  window.MDCore.Export = {
    downloadBlob,
    exportMarkdown,
    exportTxt,
    exportHtml,
    copyMarkdown,
    copyHtml,
    triggerPdfPrint
  };
})();
