// MD Writer — Terminal Edition (CRT Matrix / Wargames) Logic

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Feather Icons
  if (window.feather) {
    feather.replace();
  }

  // Local Storage Keys
  const DRAFT_KEY = 'md_writer_draft';
  const THEME_KEY = 'md_writer_crt_theme';
  const FX_KEY = 'md_writer_crt_fx';
  const SOUND_KEY = 'md_writer_terminal_sound';

  // DOM Element References
  const html = document.documentElement;
  const crtMonitor = document.getElementById('crtMonitor');
  const docTitleInput = document.getElementById('docTitle');
  const docCategoriesInput = document.getElementById('docCategories');
  const editorTextarea = document.getElementById('editorTextarea');
  const lineNumbers = document.getElementById('lineNumbers');
  const previewContainer = document.getElementById('previewContainer');
  const filenamePreview = document.getElementById('filenamePreview');
  const clockDisplay = document.getElementById('clockDisplay');

  // Views & Tabs
  const tabEditor = document.getElementById('tabEditor');
  const tabPreview = document.getElementById('tabPreview');
  const editorView = document.getElementById('editorView');
  const previewView = document.getElementById('previewView');

  // Controls & Toggles
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const fullscreenIcon = document.getElementById('fullscreenIcon');
  const floatingExitFs = document.getElementById('floatingExitFs');

  // CRT FX Buttons
  const btnToggleScanlines = document.getElementById('btnToggleScanlines');
  const btnToggleCurved = document.getElementById('btnToggleCurved');
  const btnToggleGlow = document.getElementById('btnToggleGlow');
  const btnToggleFlicker = document.getElementById('btnToggleFlicker');
  const themeBtns = document.querySelectorAll('.theme-btn');

  // Chips & Actions
  const chipDate = document.getElementById('chipDate');
  const chipLocation = document.getElementById('chipLocation');
  const chipNoteNo = document.getElementById('chipNoteNo');

  const exportDropdown = document.getElementById('exportDropdown');
  const btnExportMenu = document.getElementById('btnExportMenu');
  const btnExportMd = document.getElementById('btnExportMd');
  const btnPrintPdf = document.getElementById('btnPrintPdf');
  const btnCopyMdDropdown = document.getElementById('btnCopyMdDropdown');
  const btnCopyMd = document.getElementById('btnCopyMd');
  const btnClear = document.getElementById('btnClear');
  const btnLoadSample = document.getElementById('btnLoadSample');
  const btnShortcuts = document.getElementById('btnShortcuts');
  const shortcutModal = document.getElementById('shortcutModal');
  const btnCloseShortcutModal = document.getElementById('btnCloseShortcutModal');
  const toast = document.getElementById('toast');

  // Stats Counters
  const statWords = document.getElementById('statWords');
  const statChars = document.getElementById('statChars');
  const statLines = document.getElementById('statLines');
  const statReadTime = document.getElementById('statReadTime');

  // Marked Parser Config
  if (window.marked) {
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });
  }

  // Setup Turndown for HTML-to-Markdown conversion
  let turndownService = null;
  if (window.TurndownService) {
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

  let isUpdatingFromVisual = false;
  let isUpdatingFromMarkdown = false;

  // Sample Data (Møns Klint Field Diary)
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

  // ----------------------------------------------------
  // DIGITAL RETRO TERMINAL WEB AUDIO SYNTHESIZER
  // ----------------------------------------------------
  let soundEnabled = true;
  let audioCtx = null;

  // Restore Sound Preference
  const savedSound = localStorage.getItem(SOUND_KEY);
  if (savedSound !== null) {
    soundEnabled = savedSound === 'true';
    updateSoundUI();
  }

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  ['click', 'keydown', 'mousedown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => initAudio(), { once: false, passive: true });
  });

  function updateSoundUI() {
    if (soundEnabled) {
      btnSoundToggle.classList.add('active');
      soundIcon.setAttribute('data-feather', 'volume-2');
      btnSoundToggle.setAttribute('title', 'Terminal lyd slået til');
    } else {
      btnSoundToggle.classList.remove('active');
      soundIcon.setAttribute('data-feather', 'volume-x');
      btnSoundToggle.setAttribute('title', 'Terminal lyd slået fra');
    }
    if (window.feather) feather.replace();
  }

  btnSoundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem(SOUND_KEY, soundEnabled);
    updateSoundUI();
    if (soundEnabled) playTerminalTypingSound('char');
  });

  // Precise Retro Terminal Sound Synthesizer
  function playTerminalTypingSound(type = 'char') {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;

      if (type === 'char') {
        // High frequency digital micro-click + soft resonant phosphor beep
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        const freq = 1600 + Math.random() * 800; // 1600-2400Hz retro terminal click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.02);

      } else if (type === 'space') {
        // Lower pitch thud
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 + Math.random() * 150, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.03);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.04);

      } else if (type === 'enter') {
        // Line-feed dual tone chime / CRT carriage beep
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'square';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.setValueAtTime(800, now + 0.03);

        osc2.frequency.setValueAtTime(2400, now);
        osc2.frequency.setValueAtTime(1600, now + 0.03);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.075);
        osc2.stop(now + 0.075);

      } else if (type === 'backspace') {
        // Downward frequency sweep click
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch (e) {
      // Audio playback safety catch
    }
  }

  // ----------------------------------------------------
  // CRT THEMES & EFFECTS MANAGEMENT
  // ----------------------------------------------------
  const savedTheme = localStorage.getItem(THEME_KEY) || 'matrix';
  setCRTTheme(savedTheme);

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      setCRTTheme(theme);
    });
  });

  function setCRTTheme(theme) {
    html.setAttribute('data-crt-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    themeBtns.forEach(b => {
      if (b.getAttribute('data-theme') === theme) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  // Restore CRT FX settings
  const savedFX = JSON.parse(localStorage.getItem(FX_KEY) || '{}');
  const fxState = {
    scanlines: savedFX.scanlines !== undefined ? savedFX.scanlines : true,
    curved: savedFX.curved !== undefined ? savedFX.curved : true,
    glow: savedFX.glow !== undefined ? savedFX.glow : true,
    flicker: savedFX.flicker !== undefined ? savedFX.flicker : false
  };

  applyFXState();

  function applyFXState() {
    html.setAttribute('data-scanlines', fxState.scanlines);
    html.setAttribute('data-curved', fxState.curved);
    html.setAttribute('data-glow', fxState.glow);
    html.setAttribute('data-flicker', fxState.flicker);

    btnToggleScanlines.classList.toggle('active', fxState.scanlines);
    btnToggleCurved.classList.toggle('active', fxState.curved);
    btnToggleGlow.classList.toggle('active', fxState.glow);
    btnToggleFlicker.classList.toggle('active', fxState.flicker);

    localStorage.setItem(FX_KEY, JSON.stringify(fxState));
  }

  btnToggleScanlines.addEventListener('click', () => {
    fxState.scanlines = !fxState.scanlines;
    applyFXState();
  });
  btnToggleCurved.addEventListener('click', () => {
    fxState.curved = !fxState.curved;
    applyFXState();
  });
  btnToggleGlow.addEventListener('click', () => {
    fxState.glow = !fxState.glow;
    applyFXState();
  });
  btnToggleFlicker.addEventListener('click', () => {
    fxState.flicker = !fxState.flicker;
    applyFXState();
  });

  // ----------------------------------------------------
  // DRAFT AUTO-SAVE & RESTORE (LOCALSTORAGE SYNC)
  // ----------------------------------------------------
  function saveDraft() {
    const draft = {
      title: docTitleInput.value,
      categories: docCategoriesInput.value,
      body: editorTextarea.value,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {}
    updateFilenamePreview();
    updateStats();
    updateLineNumbers();
  }

  function restoreDraft() {
    try {
      const saved = localStorage.getItem(DRAFT_KEY) || sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        docTitleInput.value = draft.title || '';
        docCategoriesInput.value = draft.categories || '';
        editorTextarea.value = draft.body || '';
        return true;
      }
    } catch (e) {}
    return false;
  }

  // Load initial content
  if (!restoreDraft()) {
    docTitleInput.value = sampleData.title;
    docCategoriesInput.value = sampleData.categories;
    editorTextarea.value = sampleData.body;
    saveDraft();
  } else {
    updateFilenamePreview();
    updateStats();
    updateLineNumbers();
  }

  // Input listeners
  docTitleInput.addEventListener('input', () => {
    saveDraft();
    playTerminalTypingSound('char');
  });
  docCategoriesInput.addEventListener('input', () => {
    saveDraft();
    playTerminalTypingSound('char');
  });

  editorTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      playTerminalTypingSound('enter');
    } else if (e.key === 'Backspace') {
      playTerminalTypingSound('backspace');
    } else if (e.key === ' ') {
      playTerminalTypingSound('space');
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      playTerminalTypingSound('char');
    }

    // Tab key support
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editorTextarea.selectionStart;
      const end = editorTextarea.selectionEnd;
      editorTextarea.value = editorTextarea.value.substring(0, start) + '  ' + editorTextarea.value.substring(end);
      editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 2;
      saveDraft();
    }
  });

  editorTextarea.addEventListener('input', () => {
    saveDraft();
    renderPreview();
  });

  editorTextarea.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editorTextarea.scrollTop;
  });

  // ----------------------------------------------------
  // HELPERS: FILENAME PREVIEW & STATS & LINE NUMBERS
  // ----------------------------------------------------
  function getYYMMDD() {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }

  function updateFilenamePreview() {
    const titleVal = docTitleInput.value.trim();
    const dateStr = getYYMMDD();
    let sanitizedTitle = titleVal
      .toLowerCase()
      .replace(/[^a-z0-9æøå\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    if (!sanitizedTitle) sanitizedTitle = 'dokument';
    filenamePreview.textContent = `${dateStr}_${sanitizedTitle}.md`;
  }

  function updateLineNumbers() {
    const lines = editorTextarea.value.split('\n').length;
    let numbersArr = [];
    for (let i = 1; i <= Math.max(lines, 1); i++) {
      numbersArr.push(i);
    }
    lineNumbers.textContent = numbersArr.join('\n');
  }

  function updateStats() {
    const text = editorTextarea.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text.split('\n').length;
    const readTime = Math.ceil(words / 200);

    statWords.textContent = `${words} ORD`;
    statChars.textContent = `${chars} TEGN`;
    statLines.textContent = `${lines} LINJER`;
    statReadTime.textContent = readTime <= 1 ? '< 1 MIN LÆSETID' : `${readTime} MIN LÆSETID`;
  }

  // Real-time Digital Clock
  function updateClock() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    clockDisplay.textContent = `${hrs}:${mins}:${secs}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ----------------------------------------------------
  // HTML RENDER PREVIEW
  // ----------------------------------------------------
  function renderPreview() {
    if (!window.marked || !window.DOMPurify) return;
    const rawMarkdown = editorTextarea.value;
    let rawHtml = marked.parse(rawMarkdown);
    rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '<span class="return-symbol br-symbol">↵</span><br>');
    rawHtml = rawHtml.replace(/<\/p>/gi, '<span class="return-symbol p-symbol">↵</span></p>');
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    previewContainer.innerHTML = cleanHtml;
  }

  // Tab switching
  tabEditor.addEventListener('click', () => {
    tabEditor.classList.add('active');
    tabPreview.classList.remove('active');
    editorView.classList.remove('hidden');
    previewView.classList.add('hidden');
  });

  tabPreview.addEventListener('click', () => {
    tabPreview.classList.add('active');
    tabEditor.classList.remove('active');
    previewView.classList.remove('hidden');
    editorView.classList.add('hidden');
    renderPreview();
  });

  function updateToolbarStates() {
    const activeCmds = new Set();

    if (editorTextarea) {
      const text = editorTextarea.value;
      const start = editorTextarea.selectionStart;
      const end = editorTextarea.selectionEnd;

      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = text.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = text.length;
      const lineText = text.substring(lineStart, lineEnd);

      if (/^#\s+/.test(lineText)) activeCmds.add('h1');
      else if (/^##\s+/.test(lineText)) activeCmds.add('h2');
      else if (/^###\s+/.test(lineText)) activeCmds.add('h3');
      else if (/^>\s+/.test(lineText)) activeCmds.add('quote');
      else if (/^-\s+/.test(lineText) || /^\*\s+/.test(lineText)) activeCmds.add('ul');
      else if (/^\d+\.\s+/.test(lineText)) activeCmds.add('ol');

      const selText = text.substring(start, end);
      const prefix = text.substring(Math.max(0, start - 3), start);
      const suffix = text.substring(end, Math.min(text.length, end + 3));

      if ((prefix.endsWith('**') && suffix.startsWith('**')) || (selText.startsWith('**') && selText.endsWith('**') && selText.length >= 4)) {
        activeCmds.add('bold');
      }
      if ((prefix.endsWith('*') && !prefix.endsWith('**') && suffix.startsWith('*') && !suffix.startsWith('**')) || (selText.startsWith('*') && selText.endsWith('*') && selText.length >= 2)) {
        activeCmds.add('italic');
      }
      if ((prefix.endsWith('`') && suffix.startsWith('`')) || (selText.startsWith('`') && selText.endsWith('`') && selText.length >= 2)) {
        activeCmds.add('code');
      }
    }

    document.querySelectorAll('.term-key[data-cmd]').forEach(btn => {
      const cmd = btn.getAttribute('data-cmd');
      if (activeCmds.has(cmd)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // ----------------------------------------------------
  // TOOLBAR COMMANDS
  // ----------------------------------------------------
  function insertFormatting(prefix, suffix = '') {
    const start = editorTextarea.selectionStart;
    const end = editorTextarea.selectionEnd;
    const selected = editorTextarea.value.substring(start, end);
    const replacement = `${prefix}${selected || 'tekst'}${suffix}`;

    editorTextarea.value = editorTextarea.value.substring(0, start) + replacement + editorTextarea.value.substring(end);
    editorTextarea.focus();
    editorTextarea.selectionStart = start + prefix.length;
    editorTextarea.selectionEnd = start + prefix.length + (selected.length || 5);
    saveDraft();
    updateToolbarStates();
  }

  document.querySelectorAll('.term-key[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      switch (cmd) {
        case 'h1': insertFormatting('# '); break;
        case 'h2': insertFormatting('## '); break;
        case 'h3': insertFormatting('### '); break;
        case 'bold': insertFormatting('**', '**'); break;
        case 'italic': insertFormatting('*', '*'); break;
        case 'code': insertFormatting('`', '`'); break;
        case 'quote': insertFormatting('> '); break;
        case 'ul': insertFormatting('- '); break;
        case 'ol': insertFormatting('1. '); break;
        case 'task': insertFormatting('- [ ] '); break;
        case 'link': {
          const start = editorTextarea.selectionStart;
          const end = editorTextarea.selectionEnd;
          const selected = editorTextarea.value.substring(start, end);
          if (selected) {
            insertFormatting('[', '](https://example.com)');
          } else {
            insertFormatting('[Link tekst](https://example.com)');
          }
          break;
        }
        case 'codeblock': {
          const start = editorTextarea.selectionStart;
          const end = editorTextarea.selectionEnd;
          const selected = editorTextarea.value.substring(start, end);
          const block = `\`\`\`javascript\n${selected || '// Skriv kode her'}\n\`\`\``;
          editorTextarea.value = editorTextarea.value.substring(0, start) + block + editorTextarea.value.substring(end);
          editorTextarea.focus();
          editorTextarea.selectionStart = start + 14;
          editorTextarea.selectionEnd = start + 14 + (selected ? selected.length : 17);
          saveDraft();
          updateToolbarStates();
          break;
        }
        case 'table': {
          const start = editorTextarea.selectionStart;
          const end = editorTextarea.selectionEnd;
          const tbl = `| Kolonne 1 | Kolonne 2 | Kolonne 3 |\n| --- | --- | --- |\n| Værdi 1 | Værdi 2 | Værdi 3 |\n| Værdi 4 | Værdi 5 | Værdi 6 |`;
          editorTextarea.value = editorTextarea.value.substring(0, start) + tbl + editorTextarea.value.substring(end);
          editorTextarea.focus();
          editorTextarea.selectionStart = start + 2;
          editorTextarea.selectionEnd = start + 11;
          saveDraft();
          updateToolbarStates();
          break;
        }
        case 'hr': {
          const start = editorTextarea.selectionStart;
          const end = editorTextarea.selectionEnd;
          const hrStr = `\n---\n`;
          editorTextarea.value = editorTextarea.value.substring(0, start) + hrStr + editorTextarea.value.substring(end);
          editorTextarea.focus();
          editorTextarea.selectionStart = start + hrStr.length;
          editorTextarea.selectionEnd = start + hrStr.length;
          saveDraft();
          updateToolbarStates();
          break;
        }
      }
      playTerminalTypingSound('char');
    });
  });

  // ----------------------------------------------------
  // QUICK CHIPS
  // ----------------------------------------------------
  function getFormattedDanishDate() {
    const today = new Date();
    const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
    return `${today.getDate()}. ${months[today.getMonth()]} ${today.getFullYear()}`;
  }

  chipDate.addEventListener('click', () => {
    const dateStr = `Dato: ${getFormattedDanishDate()}`;
    if (!docCategoriesInput.value.includes('Dato:')) {
      docCategoriesInput.value = docCategoriesInput.value ? `${docCategoriesInput.value} | ${dateStr}` : dateStr;
      saveDraft();
      showToast('Dags dato tilføjet');
    }
  });

  chipLocation.addEventListener('click', () => {
    const appendLoc = (locStr) => {
      if (!docCategoriesInput.value.includes('Sted:')) {
        docCategoriesInput.value = docCategoriesInput.value ? `${docCategoriesInput.value} | ${locStr}` : locStr;
        saveDraft();
        showToast('Sted tilføjet');
      }
    };

    if (!navigator.geolocation) {
      appendLoc('Sted: ');
      return;
    }

    showToast('Søger efter placering...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
            const country = addr.country || '';
            let locationStr = 'Sted: ';
            if (city && country) {
              locationStr += `${city}, ${country}`;
            } else if (city || country) {
              locationStr += (city || country);
            }
            appendLoc(locationStr);
          } else {
            appendLoc('Sted: ');
          }
        } catch (e) {
          appendLoc('Sted: ');
        }
      },
      () => {
        appendLoc('Sted: ');
      },
      { timeout: 7000 }
    );
  });

  chipNoteNo.addEventListener('click', () => {
    const tagStr = 'Tags: ';
    if (!docCategoriesInput.value.includes('Tags:')) {
      docCategoriesInput.value = docCategoriesInput.value ? `${docCategoriesInput.value} | ${tagStr}` : tagStr;
      saveDraft();
      showToast('Tags skabelon tilføjet');
    }
  });

  // Load sample & clear
  btnLoadSample.addEventListener('click', () => {
    if (confirm('Vil du erstatte dit nuværende indhold med Møns Klint feltjournal eksemplet?')) {
      docTitleInput.value = sampleData.title;
      docCategoriesInput.value = sampleData.categories;
      editorTextarea.value = sampleData.body;
      saveDraft();
      showToast('Eksempel indlæst');
    }
  });

  btnClear.addEventListener('click', () => {
    if (confirm('Er du sikker på, at du vil rydde skærmen?')) {
      docTitleInput.value = '';
      docCategoriesInput.value = '';
      editorTextarea.value = '';
      saveDraft();
      showToast('Skærm ryddet');
    }
  });

  btnCopyMd.addEventListener('click', copyMarkdownToClipboard);
  btnCopyMdDropdown.addEventListener('click', copyMarkdownToClipboard);

  function copyMarkdownToClipboard() {
    const title = docTitleInput.value.trim();
    const categories = docCategoriesInput.value.trim();
    const body = editorTextarea.value;

    let combined = '';
    if (title) combined += `# ${title}\n\n`;
    if (categories) combined += `*${categories}*\n\n---\n\n`;
    combined += body;

    navigator.clipboard.writeText(combined).then(() => {
      showToast('Markdown kopieret til udklipsholder');
    }).catch(() => {
      showToast('Fejl ved kopiering');
    });
  }

  // ----------------------------------------------------
  // EXPORT MENU (MD DOWNLOAD & PDF PRINT)
  // ----------------------------------------------------
  btnExportMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    exportDropdown.classList.remove('open');
  });

  btnExportMd.addEventListener('click', downloadMdFile);
  btnPrintPdf.addEventListener('click', printPdf);

  function downloadMdFile() {
    const title = docTitleInput.value.trim();
    const categories = docCategoriesInput.value.trim();
    const body = editorTextarea.value;

    let content = '';
    if (title) content += `# ${title}\n\n`;
    if (categories) content += `*${categories}*\n\n---\n\n`;
    content += body;

    const filename = filenamePreview.textContent;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloadet ${filename}`);
  }

  function printPdf() {
    window.print();
  }

  // ----------------------------------------------------
  // FULLSCREEN & SHORTCUTS MODAL
  // ----------------------------------------------------
  btnFullscreen.addEventListener('click', toggleFullscreen);
  floatingExitFs.addEventListener('click', toggleFullscreen);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        document.body.classList.add('fullscreen-active');
        floatingExitFs.classList.remove('hidden');
        fullscreenIcon.setAttribute('data-feather', 'minimize');
        if (window.feather) feather.replace();
        showToast('Fuldskærmsmodus aktiveret (ESC for at afslutte)');
      }).catch(err => {
        showToast('Kunne ikke aktivere fuldskærm');
      });
    } else {
      document.exitFullscreen().then(() => {
        document.body.classList.remove('fullscreen-active');
        floatingExitFs.classList.add('hidden');
        fullscreenIcon.setAttribute('data-feather', 'maximize');
        if (window.feather) feather.replace();
      });
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      document.body.classList.remove('fullscreen-active');
      floatingExitFs.classList.add('hidden');
      fullscreenIcon.setAttribute('data-feather', 'maximize');
      if (window.feather) feather.replace();
    }
  });

  const fKeyMap = {
    'F1': 'h1',
    'F2': 'h2',
    'F3': 'h3',
    'F4': 'bold',
    'F5': 'italic',
    'F6': 'code',
    'F7': 'quote',
    'F8': 'ul',
    'F9': 'ol',
    'F10': 'task',
    'F11': 'link',
    'F12': 'codeblock'
  };

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (fKeyMap[e.key]) {
      e.preventDefault();
      const btn = document.querySelector(`.term-key[data-cmd="${fKeyMap[e.key]}"]`);
      if (btn) btn.click();
      return;
    }
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      toggleFullscreen();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      downloadMdFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      printPdf();
    }
    if (e.key === 'Escape') {
      shortcutModal.classList.add('hidden');
    }
  });

  btnShortcuts.addEventListener('click', () => {
    shortcutModal.classList.remove('hidden');
  });

  btnCloseShortcutModal.addEventListener('click', () => {
    shortcutModal.classList.add('hidden');
  });

  document.addEventListener('selectionchange', updateToolbarStates);

  if (editorTextarea) {
    editorTextarea.addEventListener('keyup', updateToolbarStates);
    editorTextarea.addEventListener('click', updateToolbarStates);
    editorTextarea.addEventListener('input', renderPreview);
  }

  function showToast(msg) {
    const toastMsg = document.getElementById('toastMsg');
    toastMsg.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }
});
