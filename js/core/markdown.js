/**
 * MD Writer - Core Markdown Engine Module
 * Configures Marked, DOMPurify, Mermaid diagrams, and Turndown HTML-to-Markdown converter.
 */

(function () {
  window.MDCore = window.MDCore || {};

  // Setup Marked defaults
  if (window.marked) {
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });
  }

  // Setup Turndown for HTML -> Markdown conversion
  let turndownService = null;
  function getTurndownService() {
    if (!turndownService && window.TurndownService) {
      turndownService = new window.TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
        strongDelimiter: '**',
        bulletListMarker: '-'
      });

      turndownService.addRule('strikethrough', {
        filter: ['del', 's', 'strike'],
        replacement: function (content) {
          return '~~' + content + '~~';
        }
      });

      turndownService.addRule('tasklist', {
        filter: function (node) {
          return node.tagName === 'INPUT' && node.getAttribute('type') === 'checkbox';
        },
        replacement: function (content, node) {
          return node.checked ? '[x] ' : '[ ] ';
        }
      });

      turndownService.addRule('ignoreReturnSymbols', {
        filter: function (node) {
          return node.classList && node.classList.contains('return-symbol');
        },
        replacement: function () {
          return '';
        }
      });
    }
    return turndownService;
  }

  /**
   * Convert Markdown string to sanitized HTML with return symbols
   */
  function parseToHtml(markdownText = '', options = { showReturnSymbols: true }) {
    if (!window.marked) return markdownText;

    let rawHtml = marked.parse(markdownText || '');

    if (options.showReturnSymbols) {
      rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '<span class="return-symbol br-symbol">↵</span><br>');
      rawHtml = rawHtml.replace(/<\/p>/gi, '<span class="return-symbol p-symbol">↵</span></p>');
    }

    if (window.DOMPurify) {
      return DOMPurify.sanitize(rawHtml);
    }
    return rawHtml;
  }

  /**
   * Convert HTML back to Markdown using Turndown
   */
  function htmlToMarkdown(htmlString = '') {
    const service = getTurndownService();
    if (!service) return htmlString;
    return service.turndown(htmlString);
  }

  /**
   * Render Mermaid diagrams within a container
   */
  function renderMermaid(container, isDark = true) {
    if (!window.mermaid || !container) return;
    const mermaidCodes = container.querySelectorAll('code.language-mermaid, pre.language-mermaid');
    if (mermaidCodes.length === 0) return;

    mermaidCodes.forEach((el) => {
      const parent = el.tagName.toLowerCase() === 'code' ? el.parentElement : el;
      const codeText = el.textContent;
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = codeText;
      parent.replaceWith(div);
    });

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose'
      });
      mermaid.run({
        querySelector: '.mermaid'
      }).catch(() => {});
    } catch (err) {
      console.warn('Mermaid rendering error:', err);
    }
  }

  /**
   * Complete render pipeline into previewContainer
   */
  function renderPreview(markdownText, previewContainer, isDark = true) {
    if (!previewContainer) return;
    const cleanHtml = parseToHtml(markdownText);
    previewContainer.innerHTML = cleanHtml;
    renderMermaid(previewContainer, isDark);
  }

  window.MDCore.Markdown = {
    parseToHtml,
    htmlToMarkdown,
    renderMermaid,
    renderPreview,
    getTurndownService
  };
})();
