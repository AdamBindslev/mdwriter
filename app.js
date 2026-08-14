// MD Writer Application Logic

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Feather Icons
  if (window.feather) {
    feather.replace();
  }

  // DOM Element References
  const docTitleInput = document.getElementById('docTitle');
  const docCategoriesInput = document.getElementById('docCategories');
  const editorTextarea = document.getElementById('editorTextarea');
  const previewContainer = document.getElementById('previewContainer');
  const filenamePreview = document.getElementById('filenamePreview');
  const saveIndicator = document.getElementById('saveIndicator');

  // View Mode Controls
  const workspace = document.getElementById('workspace');
  const btnViewSplit = document.getElementById('btnViewSplit');
  const btnViewEditor = document.getElementById('btnViewEditor');
  const btnViewPreview = document.getElementById('btnViewPreview');

  // Theme Toggle
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');

  // Quick Chips
  const chipDate = document.getElementById('chipDate');
  const chipLocation = document.getElementById('chipLocation');
  const chipNoteNo = document.getElementById('chipNoteNo');

  // Actions
  const btnExportMd = document.getElementById('btnExportMd');
  const btnCopyMd = document.getElementById('btnCopyMd');
  const btnClear = document.getElementById('btnClear');
  const btnLoadSample = document.getElementById('btnLoadSample');
  const toast = document.getElementById('toast');

  // Counters
  const statWords = document.getElementById('statWords');
  const statChars = document.getElementById('statChars');
  const statLines = document.getElementById('statLines');
  const statReadTime = document.getElementById('statReadTime');

  // Configure Marked Parser options safely
  if (window.marked) {
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });
  }

  // Sample Data (Møns Klint Field Diary matching prompt attachment)
  const sampleData = {
    title: 'Feltdagbog: Vandring ved Møns Klint',
    categories: 'Dato: 14. august 2026 | Sted: Møns Klint, Danmark | Notat #042',
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

  // Helper: Format Today's Date into YYMMDD format (e.g. 2026-08-14 -> 260814)
  function getYYMMDD() {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }

  // Helper: Format Danish Human Readable Date string (e.g. "14. august 2026")
  function getFormattedDanishDate() {
    const today = new Date();
    const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
    return `${today.getDate()}. ${months[today.getMonth()]} ${today.getFullYear()}`;
  }

  // Helper: Sanitize title for filename
  function sanitizeFilename(title) {
    if (!title || !title.trim()) return 'dokument';
    let clean = title.trim();
    // Replace illegal filename characters
    clean = clean.replace(/[\/\\:*?"<>|]/g, '');
    // Clean spaces & trim length if too long
    clean = clean.replace(/\s+/g, ' ');
    return clean;
  }

  // Calculate Export Filename: yymmdd titel.md
  function getExportFilename() {
    const dateStr = getYYMMDD();
    const titleStr = sanitizeFilename(docTitleInput.value);
    return `${dateStr} ${titleStr}.md`;
  }

  // Update Filename Badge Preview
  function updateFilenameBadge() {
    filenamePreview.textContent = getExportFilename();
  }

  // Full Markdown Generator: Combines Title (#), Categories (*...*), and Body Text
  function generateFullMarkdown() {
    const title = docTitleInput.value.trim();
    const categories = docCategoriesInput.value.trim();
    const body = editorTextarea.value;

    let fullMarkdown = '';

    if (title) {
      fullMarkdown += `# ${title}\n\n`;
    }

    if (categories) {
      fullMarkdown += `*${categories}*\n\n`;
    }

    fullMarkdown += body;

    return fullMarkdown;
  }

  // Update Rendered HTML Preview & Counters
  function renderPreview() {
    const markdownText = generateFullMarkdown();

    if (window.marked && window.DOMPurify) {
      const rawHtml = marked.parse(markdownText);
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      previewContainer.innerHTML = cleanHtml;
    } else {
      previewContainer.textContent = markdownText;
    }

    updateCounters();
    updateFilenameBadge();
  }

  // Update Word / Character / Reading Time Statistics
  function updateCounters() {
    const text = generateFullMarkdown();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text ? text.split('\n').length : 0;
    const readTimeMins = Math.ceil(words / 200);

    statWords.textContent = `${words} ${words === 1 ? 'ord' : 'ord'}`;
    statChars.textContent = `${chars} tegn`;
    statLines.textContent = `${lines} linjer`;
    statReadTime.textContent = readTimeMins <= 1 ? '< 1 min læsetid' : `ca. ${readTimeMins} min læsetid`;
  }

  // Toast Notification Trigger
  function showToast(message, icon = 'check-circle') {
    toast.innerHTML = `<i data-feather="${icon}"></i> <span>${message}</span>`;
    if (window.feather) feather.replace();
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Clear all fields on startup
  function clearAllFields() {
    docTitleInput.value = '';
    docCategoriesInput.value = '';
    editorTextarea.value = '';
    try {
      localStorage.removeItem('md_writer_draft');
    } catch (e) {}
  }

  // Formatting Toolbar Helper Actions
  function applyFormat(command) {
    const start = editorTextarea.selectionStart;
    const end = editorTextarea.selectionEnd;
    const selectedText = editorTextarea.value.substring(start, end);
    let replacement = '';
    let cursorOffset = 0;

    switch (command) {
      case 'h1':
        replacement = `# ${selectedText || 'Overskrift 1'}`;
        break;
      case 'h2':
        replacement = `## ${selectedText || 'Overskrift 2'}`;
        break;
      case 'h3':
        replacement = `### ${selectedText || 'Overskrift 3'}`;
        break;
      case 'bold':
        replacement = `**${selectedText || 'fed tekst'}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        replacement = `*${selectedText || 'kursiv tekst'}*`;
        cursorOffset = 1;
        break;
      case 'strikethrough':
        replacement = `~~${selectedText || 'gennemstreget tekst'}~~`;
        cursorOffset = 2;
        break;
      case 'code':
        replacement = `\`${selectedText || 'kode'}\``;
        cursorOffset = 1;
        break;
      case 'quote':
        replacement = `> ${selectedText || 'Citattekst'}`;
        break;
      case 'ul':
        replacement = selectedText ? selectedText.split('\n').map(l => `- ${l}`).join('\n') : '- Punkt 1\n- Punkt 2';
        break;
      case 'ol':
        replacement = selectedText ? selectedText.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') : '1. Første punkt\n2. Andet punkt';
        break;
      case 'task':
        replacement = selectedText ? selectedText.split('\n').map(l => `- [ ] ${l}`).join('\n') : '- [ ] Opgave 1\n- [ ] Opgave 2';
        break;
      case 'link':
        replacement = `[${selectedText || 'Link tekst'}](https://example.com)`;
        break;
      case 'image':
        replacement = `![${selectedText || 'Billedbeskrivelse'}](https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800)`;
        break;
      case 'codeblock':
        replacement = `\`\`\`javascript\n${selectedText || '// Skriv kode her'}\n\`\`\``;
        break;
      case 'table':
        replacement = `| Kolonne 1 | Kolonne 2 | Kolonne 3 |\n| --- | --- | --- |\n| Værdi 1 | Værdi 2 | Værdi 3 |\n| Værdi 4 | Værdi 5 | Værdi 6 |`;
        break;
      case 'hr':
        replacement = `\n---\n`;
        break;
      default:
        return;
    }

    editorTextarea.setRangeText(replacement, start, end, 'select');
    editorTextarea.focus();
    renderPreview();
  }

  // Toolbar Button Click Listeners
  document.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      applyFormat(cmd);
    });
  });

  // Quick Chips Actions for Metadata Input - Inserts clean label tags without pre-filled values
  function appendCategoryTag(tagLabel) {
    if (!docCategoriesInput.value) {
      docCategoriesInput.value = tagLabel;
    } else {
      // Append tag with separator if not already present
      const current = docCategoriesInput.value.trim();
      docCategoriesInput.value = current ? `${current} | ${tagLabel}` : tagLabel;
    }
    docCategoriesInput.focus();
    renderPreview();
  }

  chipDate.addEventListener('click', () => {
    appendCategoryTag('Dato: ');
  });

  chipLocation.addEventListener('click', () => {
    appendCategoryTag('Sted: ');
  });

  chipNoteNo.addEventListener('click', () => {
    appendCategoryTag('Notat #: ');
  });

  // View Mode Buttons
  function setViewMode(mode) {
    btnViewSplit.classList.remove('active');
    btnViewEditor.classList.remove('active');
    btnViewPreview.classList.remove('active');

    workspace.classList.remove('mode-split', 'mode-editor', 'mode-preview');

    if (mode === 'split') {
      btnViewSplit.classList.add('active');
      workspace.classList.add('mode-split');
    } else if (mode === 'editor') {
      btnViewEditor.classList.add('active');
      workspace.classList.add('mode-editor');
    } else if (mode === 'preview') {
      btnViewPreview.classList.add('active');
      workspace.classList.add('mode-preview');
    }
  }

  btnViewSplit.addEventListener('click', () => setViewMode('split'));
  btnViewEditor.addEventListener('click', () => setViewMode('editor'));
  btnViewPreview.addEventListener('click', () => setViewMode('preview'));

  // Dark / Light Theme Toggle
  btnThemeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    themeIcon.setAttribute('data-feather', newTheme === 'light' ? 'moon' : 'sun');
    if (window.feather) feather.replace();
    showToast(`Skiftede til ${newTheme === 'light' ? 'Lyst' : 'Mørkt'} tema`);
  });

  // Download File Action: yymmdd titel.md
  btnExportMd.addEventListener('click', () => {
    const markdownContent = generateFullMarkdown();
    const filename = getExportFilename();

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Fil gemt som: ${filename}`, 'download');
  });

  // Copy MD to Clipboard
  btnCopyMd.addEventListener('click', () => {
    const markdownContent = generateFullMarkdown();
    navigator.clipboard.writeText(markdownContent).then(() => {
      showToast('Markdown kopieret til udklipsholder!', 'copy');
    }).catch(err => {
      console.error('Kopiering mislykkedes', err);
    });
  });

  // Clear Action
  btnClear.addEventListener('click', () => {
    if (confirm('Er du sikker på, at du vil rydde alle felter?')) {
      docTitleInput.value = '';
      docCategoriesInput.value = '';
      editorTextarea.value = '';
      renderPreview();
      showToast('Tekst ryddet', 'trash-2');
    }
  });

  // Load Sample Action (Møns Klint)
  btnLoadSample.addEventListener('click', () => {
    docTitleInput.value = sampleData.title;
    docCategoriesInput.value = sampleData.categories;
    editorTextarea.value = sampleData.body;
    renderPreview();
    showToast('Eksempel på feltdagbog indlæst!', 'file-text');
  });

  // Input Listeners for Realtime Sync
  docTitleInput.addEventListener('input', renderPreview);
  docCategoriesInput.addEventListener('input', renderPreview);
  editorTextarea.addEventListener('input', renderPreview);

  // Synchronized Scrolling between Editor and Preview
  let isScrollingEditor = false;
  let isScrollingPreview = false;

  editorTextarea.addEventListener('scroll', () => {
    if (isScrollingPreview) return;
    isScrollingEditor = true;
    const percentage = editorTextarea.scrollTop / (editorTextarea.scrollHeight - editorTextarea.clientHeight);
    previewContainer.scrollTop = percentage * (previewContainer.scrollHeight - previewContainer.clientHeight);
    setTimeout(() => { isScrollingEditor = false; }, 50);
  });

  previewContainer.addEventListener('scroll', () => {
    if (isScrollingEditor) return;
    isScrollingPreview = true;
    const percentage = previewContainer.scrollTop / (previewContainer.scrollHeight - previewContainer.clientHeight);
    editorTextarea.scrollTop = percentage * (editorTextarea.scrollHeight - editorTextarea.clientHeight);
    setTimeout(() => { isScrollingPreview = false; }, 50);
  });

  // Drag & Drop File Upload Support
  const dragOverlay = document.getElementById('dragOverlay');

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    workspace.classList.add('drag-over');
  });

  dragOverlay.addEventListener('dragleave', (e) => {
    e.preventDefault();
    workspace.classList.remove('drag-over');
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    workspace.classList.remove('drag-over');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          parseAndLoadMdFile(file.name, content);
        };
        reader.readAsText(file);
      } else {
        showToast('Venligst upload en .md eller .txt fil', 'alert-circle');
      }
    }
  });

  // Helper: Parse imported MD file into Title, Categories, and Body
  function parseAndLoadMdFile(fileName, content) {
    const lines = content.split('\n');
    let title = '';
    let categories = '';
    let bodyLines = [];

    let lineIdx = 0;

    // Check if line 1 is H1 title (# Title)
    if (lines.length > 0 && lines[0].startsWith('# ')) {
      title = lines[0].substring(2).trim();
      lineIdx++;
      // Skip blank line if present
      if (lineIdx < lines.length && lines[lineIdx].trim() === '') {
        lineIdx++;
      }
    } else {
      // Fallback title from filename
      title = fileName.replace(/\.md$/i, '');
    }

    // Check if next non-empty line is metadata in asterisks (*Dato: ...*)
    if (lineIdx < lines.length && lines[lineIdx].trim().startsWith('*') && lines[lineIdx].trim().endsWith('*')) {
      categories = lines[lineIdx].trim().slice(1, -1).trim();
      lineIdx++;
      if (lineIdx < lines.length && lines[lineIdx].trim() === '') {
        lineIdx++;
      }
    }

    // Rest is body
    bodyLines = lines.slice(lineIdx);

    docTitleInput.value = title;
    docCategoriesInput.value = categories;
    editorTextarea.value = bodyLines.join('\n');

    renderPreview();
    showToast(`Filen "${fileName}" blev indlæst!`, 'upload');
  }

  // Keyboard Shortcuts (Ctrl/Cmd + S to Export, Ctrl/Cmd + B, Ctrl/Cmd + I)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      btnExportMd.click();
    }
  });

  // Initial Startup Execution - Always starts 100% clean and empty
  clearAllFields();
  renderPreview();
});
