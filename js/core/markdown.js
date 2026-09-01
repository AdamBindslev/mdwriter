/**
 * Flowscribe - Core Markdown Engine Module
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

  // Lazy-load Promise singleton for vendor/mermaid.min.js
  let mermaidLoadingPromise = null;
  function loadMermaidScript() {
    if (window.mermaid) {
      return Promise.resolve(window.mermaid);
    }
    if (mermaidLoadingPromise) {
      return mermaidLoadingPromise;
    }

    mermaidLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'vendor/mermaid.min.js';
      script.async = true;
      script.onload = () => {
        resolve(window.mermaid);
      };
      script.onerror = (err) => {
        mermaidLoadingPromise = null;
        console.warn('Fejl ved lazy loading af mermaid.min.js:', err);
        reject(err);
      };
      document.head.appendChild(script);
    });

    return mermaidLoadingPromise;
  }

  /**
   * Render Mermaid diagrams within a container (Lazy-loaded and strictly scoped)
   */
  async function renderMermaid(container, isDark = true) {
    if (!container) return;
    const mermaidCodes = container.querySelectorAll('code.language-mermaid, pre.language-mermaid');
    if (mermaidCodes.length === 0) return;

    const createdDivs = [];
    mermaidCodes.forEach((el) => {
      const parent = el.tagName.toLowerCase() === 'code' ? el.parentElement : el;
      const codeText = el.textContent;
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = codeText;
      parent.replaceWith(div);
      createdDivs.push(div);
    });

    try {
      const mermaid = await loadMermaidScript();
      if (!mermaid) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'strict'
      });

      const mermaidNodes = container.querySelectorAll('.mermaid');
      if (mermaidNodes.length > 0) {
        await mermaid.run({
          nodes: Array.from(mermaidNodes)
        });
      }
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
    loadMermaidScript,
    getTurndownService
  };
})();
