// MD Writer — Typewriter Edition (Skrivemaskine Udgave) Logic

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

  // Tabs & Views
  const tabPaper = document.getElementById('tabPaper');
  const tabPreview = document.getElementById('tabPreview');
  const editorView = document.getElementById('editorView');
  const previewView = document.getElementById('previewView');

  // Sound & Controls
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const fullscreenIcon = document.getElementById('fullscreenIcon');
  const floatingExitFs = document.getElementById('floatingExitFs');
  const ribbonBtns = document.querySelectorAll('.ribbon-btn');

  // Chips
  const chipDate = document.getElementById('chipDate');
  const chipLocation = document.getElementById('chipLocation');
  const chipNoteNo = document.getElementById('chipNoteNo');

  // Actions & Dropdowns
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

  // Stats / Odometer
  const odometerWords = document.getElementById('odometerWords');
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
  // REAL AUDIO SAMPLE PLAYER (.wav files) WITH FALLBACK
  // ----------------------------------------------------
  const SOUND_KEY = 'md_writer_typewriter_sound';
  let soundEnabled = true;
  let audioCtx = null;

  const savedSound = localStorage.getItem(SOUND_KEY);
  if (savedSound !== null) {
    soundEnabled = savedSound === 'true';
  }

  const soundBuffers = {
    keys: [],       // Decoded AudioBuffers for key clicks
    space: null,    // AudioBuffer for spacebar
    enter: null,    // AudioBuffer for enter/return/bell
    backspace: null // AudioBuffer for backspace
  };

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

  // Global user gesture listeners to unlock AudioContext on first click or keypress
  ['click', 'keydown', 'mousedown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      initAudio();
    }, { once: false, passive: true });
  });

  // Preload real .wav audio files from sounds/ folder
  async function loadWavSample(url) {
    try {
      initAudio();
      // Bypass browser HTTP cache to ensure newly updated .wav files play immediately
      const cacheBustUrl = `${url}?v=${Date.now()}`;
      const res = await fetch(cacheBustUrl, { cache: 'no-cache' });
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      return await audioCtx.decodeAudioData(arrayBuf);
    } catch (e) {
      return null;
    }
  }

  async function preloadRealWavSounds() {
    soundBuffers.keys = [];
    const k1 = await loadWavSample('sounds/key1.wav');
    if (k1) soundBuffers.keys.push(k1);

    const k2 = await loadWavSample('sounds/key2.wav');
    if (k2) soundBuffers.keys.push(k2);

    // Fallback to single key.wav if key1/key2 not present
    if (soundBuffers.keys.length === 0) {
      const kSingle = await loadWavSample('sounds/key.wav');
      if (kSingle) soundBuffers.keys.push(kSingle);
    }

    soundBuffers.space = await loadWavSample('sounds/space.wav');
    soundBuffers.enter = await loadWavSample('sounds/enter.wav') || await loadWavSample('sounds/return.wav') || await loadWavSample('sounds/bell.wav');
    soundBuffers.backspace = await loadWavSample('sounds/backspace.wav');
  }

  let lastKeyIndex = -1;

  function playSample(buffer, pitchVar = true, isKeyClick = false) {
    if (!soundEnabled || !buffer || !audioCtx) return false;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = audioCtx.createGain();

      if (isKeyClick) {
        // Organic pitch variation (+/- 8%)
        source.playbackRate.value = 0.92 + Math.random() * 0.16;
        // Organic gain variation
        gainNode.gain.value = 0.85 + Math.random() * 0.3;

        // Subtle tone tinting via lowpass filter for extra acoustic realism
        const toneFilter = audioCtx.createBiquadFilter();
        toneFilter.type = 'lowpass';
        toneFilter.frequency.setValueAtTime(3200 + Math.random() * 2500, audioCtx.currentTime);

        source.connect(toneFilter);
        toneFilter.connect(gainNode);
      } else {
        if (pitchVar) {
          source.playbackRate.value = 0.96 + Math.random() * 0.08;
        }
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
      }

      gainNode.connect(audioCtx.destination);
      source.start(0);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Synthesize/Play Mechanical Character Key Strike ("Clack-Snap")
  function playKeyClickSound() {
    if (!soundEnabled) return;
    initAudio();

    // 1. Play real .wav sample if loaded (alternating between key1 and key2 with organic pitch & tone variation)
    if (soundBuffers.keys.length > 0) {
      let idx = Math.floor(Math.random() * soundBuffers.keys.length);
      if (soundBuffers.keys.length > 1 && idx === lastKeyIndex && Math.random() > 0.3) {
        idx = (idx + 1) % soundBuffers.keys.length;
      }
      lastKeyIndex = idx;
      const selectedBuf = soundBuffers.keys[idx];
      if (playSample(selectedBuf, true, true)) return;
    }

    // 2. Fallback to Web Audio synthesis
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const pitchVariation = 0.9 + Math.random() * 0.22;
      const gainVariation = 0.8 + Math.random() * 0.3;

      const noiseLength = 0.04;
      const bufferSize = audioCtx.sampleRate * noiseLength;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime((2400 + Math.random() * 600) * pitchVariation, now);
      bandpass.Q.setValueAtTime(4.5, now);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.4 * gainVariation, now);
      noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.038);

      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start(now);

      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 * pitchVariation, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.02);

      oscGain.gain.setValueAtTime(0.3 * gainVariation, now);
      oscGain.gain.linearRampToValueAtTime(0.0001, now + 0.02);

      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.02);
    } catch (e) {
      console.error('Audio error:', e);
    }
  }

  // Synthesize/Play Spacebar
  function playSpaceSound() {
    if (!soundEnabled) return;
    initAudio();

    if (soundBuffers.space) {
      if (playSample(soundBuffers.space, false)) return;
    }

    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const body = audioCtx.createOscillator();
      const bodyGain = audioCtx.createGain();
      body.type = 'sine';
      body.frequency.setValueAtTime(180, now);
      body.frequency.exponentialRampToValueAtTime(45, now + 0.06);

      bodyGain.gain.setValueAtTime(0.5, now);
      bodyGain.gain.linearRampToValueAtTime(0.0001, now + 0.06);

      body.connect(bodyGain);
      bodyGain.connect(audioCtx.destination);
      body.start(now);
      body.stop(now + 0.06);
    } catch (e) {
      console.error(e);
    }
  }

  // Synthesize/Play Backspace / Delete
  function playBackspaceSound() {
    if (!soundEnabled) return;
    initAudio();

    if (soundBuffers.backspace) {
      if (playSample(soundBuffers.backspace, false)) return;
    }

    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      playRatchetClick(now);
      playRatchetClick(now + 0.015);
    } catch (e) {}
  }

  function playRatchetClick(t) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.012);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + 0.012);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.012);
  }

  // Synthesize/Play Carriage Return Bell ("Ding!")
  function playBellSound() {
    if (!soundEnabled) return;
    initAudio();

    if (soundBuffers.enter) {
      if (playSample(soundBuffers.enter, false)) return;
    }

    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;

      const bell = audioCtx.createOscillator();
      const bellGain = audioCtx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(2650, now);

      bellGain.gain.setValueAtTime(0.55, now);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

      bell.connect(bellGain);
      bellGain.connect(audioCtx.destination);
      bell.start(now);
      bell.stop(now + 1.1);

      for (let i = 0; i < 4; i++) {
        playRatchetClick(now + 0.08 + i * 0.025);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function updateSoundUI() {
    if (btnSoundToggle) {
      btnSoundToggle.classList.toggle('active', soundEnabled);
      btnSoundToggle.setAttribute('title', soundEnabled ? 'Mekanisk lyd slået til' : 'Mekanisk lyd slået fra');
    }
    if (soundIcon) {
      soundIcon.setAttribute('data-feather', soundEnabled ? 'volume-2' : 'volume-x');
    }
    if (window.feather) feather.replace();
  }

  // Toggle Sound FX
  btnSoundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    try {
      localStorage.setItem(SOUND_KEY, soundEnabled);
    } catch (e) {}
    updateSoundUI();
    showToast(soundEnabled ? 'Skrivemaskinelyd Aktiveret' : 'Mekanisk lyd slået fra');
    if (soundEnabled) playKeyClickSound();
  });

  // ----------------------------------------------------
  // Ribbon Color Selector
  // ----------------------------------------------------
  ribbonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ribbonBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ribbonColor = btn.getAttribute('data-ribbon');
      document.documentElement.setAttribute('data-ribbon', ribbonColor);
      playKeyClickSound();
    });
  });

  // ----------------------------------------------------
  // Tab View Switch (Paper vs Rendered)
  // ----------------------------------------------------
  tabPaper.addEventListener('click', () => {
    tabPaper.classList.add('active');
    tabPreview.classList.remove('active');
    editorView.classList.remove('hidden');
    previewView.classList.add('hidden');
    autoResizeTextarea();
    playKeyClickSound();
  });

  tabPreview.addEventListener('click', () => {
    tabPreview.classList.add('active');
    tabPaper.classList.remove('active');
    previewView.classList.remove('hidden');
    editorView.classList.add('hidden');
    renderPreview();
    playKeyClickSound();
  });

  // ----------------------------------------------------
  // Helpers & Filename Calculation
  // ----------------------------------------------------
  function getYYMMDD() {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }

  function sanitizeFilename(title) {
    if (!title || !title.trim()) return 'dokument';
    let clean = title.trim();
    clean = clean.replace(/[\/\\:*?"<>|]/g, '');
    clean = clean.replace(/\s+/g, ' ');
    return clean;
  }

  function getExportFilename() {
    const dateStr = getYYMMDD();
    const titleStr = sanitizeFilename(docTitleInput.value);
    return `${dateStr} ${titleStr}.md`;
  }

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

  // Update Odometer Counter & Stats
  function updateOdometer() {
    const text = generateFullMarkdown();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text ? text.split('\n').length : 0;
    const readTimeMins = Math.ceil(words / 200);

    // Format Odometer 5 digits [ 0 0 0 4 2 ]
    const padded = String(words).padStart(5, '0').slice(-5);
    const digits = padded.split('');

    odometerWords.innerHTML = digits.map(d => `<span class="digit">${d}</span>`).join('');
    statChars.textContent = `${chars} tegn`;
    statLines.textContent = `${lines} linjer`;
    statReadTime.textContent = readTimeMins <= 1 ? '< 1 min læsetid' : `ca. ${readTimeMins} min læsetid`;

    filenamePreview.textContent = getExportFilename();
  }

  // Draft Storage & Sync Management
  const DRAFT_KEY = 'md_writer_draft';

  function saveDraft() {
    const draft = {
      title: docTitleInput ? docTitleInput.value : '',
      categories: docCategoriesInput ? docCategoriesInput.value : '',
      body: editorTextarea ? editorTextarea.value : '',
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {}
  }

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
      if (docTitleInput && draft.title !== undefined) docTitleInput.value = draft.title;
      if (docCategoriesInput && draft.categories !== undefined) docCategoriesInput.value = draft.categories;
      if (editorTextarea && draft.body !== undefined) editorTextarea.value = draft.body;

      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {}

      return true;
    }
    return false;
  }

  function navigateWithDraft(targetUrl) {
    const draft = {
      title: docTitleInput ? docTitleInput.value : '',
      categories: docCategoriesInput ? docCategoriesInput.value : '',
      body: editorTextarea ? editorTextarea.value : '',
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {}
    const encoded = encodeURIComponent(JSON.stringify(draft));
    window.location.href = `${targetUrl}?draft=${encoded}`;
  }

  function renderMermaidDiagrams(container) {
    if (!window.mermaid) return;
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
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose'
      });
      mermaid.run({
        querySelector: '.mermaid'
      }).catch(() => {});
    } catch (err) {}
  }

  function autoResizeTextarea() {
    if (!editorTextarea) return;
    editorTextarea.style.height = '0px';
    const scrollH = editorTextarea.scrollHeight;
    editorTextarea.style.height = Math.max(500, scrollH + 40) + 'px';
  }

  function renderPreview() {
    const markdownText = generateFullMarkdown();

    if (window.marked && window.DOMPurify) {
      let rawHtml = marked.parse(markdownText);
      rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '<span class="return-symbol br-symbol">↵</span><br>');
      rawHtml = rawHtml.replace(/<\/p>/gi, '<span class="return-symbol p-symbol">↵</span></p>');
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      previewContainer.innerHTML = cleanHtml;
      renderMermaidDiagrams(previewContainer);
    } else {
      previewContainer.textContent = markdownText;
    }

    autoResizeTextarea();
    updateOdometer();
    saveDraft();
  }

  // Toast Notification
  function showToast(message, icon = 'check-circle') {
    toast.innerHTML = `<i data-feather="${icon}"></i> <span>${message}</span>`;
    if (window.feather) feather.replace();
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Dynamic Toolbar Active State Highlight Tracker
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
      if ((prefix.endsWith('~~') && suffix.startsWith('~~')) || (selText.startsWith('~~') && selText.endsWith('~~') && selText.length >= 4)) {
        activeCmds.add('strikethrough');
      }
      if ((prefix.endsWith('`') && suffix.startsWith('`')) || (selText.startsWith('`') && selText.endsWith('`') && selText.length >= 2)) {
        activeCmds.add('code');
      }
    }

    document.querySelectorAll('.tw-key[data-cmd]').forEach(btn => {
      const cmd = btn.getAttribute('data-cmd');
      if (activeCmds.has(cmd)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Toolbar Formatting Keycaps
  function applyFormat(command) {
    playKeyClickSound();

    const start = editorTextarea.selectionStart;
    const end = editorTextarea.selectionEnd;
    const selectedText = editorTextarea.value.substring(start, end);
    let replacement = '';
    let selStart = start;
    let selEnd = end;

    switch (command) {
      case 'h1':
        replacement = selectedText ? `# ${selectedText}` : `# Overskrift 1`;
        selStart = start + 2;
        selEnd = start + 2 + (selectedText || 'Overskrift 1').length;
        break;
      case 'h2':
        replacement = selectedText ? `## ${selectedText}` : `## Overskrift 2`;
        selStart = start + 3;
        selEnd = start + 3 + (selectedText || 'Overskrift 2').length;
        break;
      case 'h3':
        replacement = selectedText ? `### ${selectedText}` : `### Overskrift 3`;
        selStart = start + 4;
        selEnd = start + 4 + (selectedText || 'Overskrift 3').length;
        break;
      case 'bold':
        replacement = selectedText ? `**${selectedText}**` : `**fed tekst**`;
        selStart = start + 2;
        selEnd = start + 2 + (selectedText || 'fed tekst').length;
        break;
      case 'italic':
        replacement = selectedText ? `*${selectedText}*` : `*kursiv tekst*`;
        selStart = start + 1;
        selEnd = start + 1 + (selectedText || 'kursiv tekst').length;
        break;
      case 'strikethrough':
        replacement = selectedText ? `~~${selectedText}~~` : `~~gennemstreget~~`;
        selStart = start + 2;
        selEnd = start + 2 + (selectedText || 'gennemstreget').length;
        break;
      case 'code':
        replacement = selectedText ? `\`${selectedText}\`` : `\`kode\``;
        selStart = start + 1;
        selEnd = start + 1 + (selectedText || 'kode').length;
        break;
      case 'quote':
        replacement = selectedText ? `> ${selectedText}` : `> Citattekst`;
        selStart = start + 2;
        selEnd = start + 2 + (selectedText || 'Citattekst').length;
        break;
      case 'ul':
        if (selectedText) {
          replacement = selectedText.split('\n').map(l => `- ${l}`).join('\n');
          selStart = start;
          selEnd = start + replacement.length;
        } else {
          const placeholder = 'Punkt 1';
          replacement = `- ${placeholder}`;
          selStart = start + 2;
          selEnd = start + 2 + placeholder.length;
        }
        break;
      case 'ol':
        if (selectedText) {
          replacement = selectedText.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
          selStart = start;
          selEnd = start + replacement.length;
        } else {
          const placeholder = 'Første punkt';
          replacement = `1. ${placeholder}`;
          selStart = start + 3;
          selEnd = start + 3 + placeholder.length;
        }
        break;
      case 'task':
        if (selectedText) {
          replacement = selectedText.split('\n').map(l => `- [ ] ${l}`).join('\n');
          selStart = start;
          selEnd = start + replacement.length;
        } else {
          const placeholder = 'Opgave 1';
          replacement = `- [ ] ${placeholder}`;
          selStart = start + 6;
          selEnd = start + 6 + placeholder.length;
        }
        break;
      case 'link':
        if (selectedText) {
          replacement = `[${selectedText}](https://example.com)`;
          selStart = start + 1 + selectedText.length + 2;
          selEnd = selStart + 'https://example.com'.length;
        } else {
          const placeholder = 'Link tekst';
          replacement = `[${placeholder}](https://example.com)`;
          selStart = start + 1;
          selEnd = start + 1 + placeholder.length;
        }
        break;
      case 'codeblock':
        if (selectedText) {
          replacement = `\`\`\`\n${selectedText}\n\`\`\``;
          selStart = start + 4;
          selEnd = start + 4 + selectedText.length;
        } else {
          const placeholder = 'Tekstblok';
          replacement = `\`\`\`\n${placeholder}\n\`\`\``;
          selStart = start + 4;
          selEnd = start + 4 + placeholder.length;
        }
        break;
      case 'diagram':
        if (selectedText) {
          replacement = `\`\`\`mermaid\nflowchart LR\n    ${selectedText}\n\`\`\``;
          selStart = start + 24;
          selEnd = start + 24 + selectedText.length;
        } else {
          const sample = `flowchart LR\n    A[Start] --> B[Proces] --> C[Slut]`;
          replacement = `\`\`\`mermaid\n${sample}\n\`\`\``;
          selStart = start + 11;
          selEnd = start + 11 + sample.length;
        }
        break;
      case 'table':
        replacement = `| Kolonne 1 | Kolonne 2 | Kolonne 3 |\n| --- | --- | --- |\n| Værdi 1 | Værdi 2 | Værdi 3 |\n| Værdi 4 | Værdi 5 | Værdi 6 |`;
        selStart = start + 2;
        selEnd = start + 11;
        break;
      case 'hr':
        replacement = `\n---\n`;
        selStart = start + replacement.length;
        selEnd = selStart;
        break;
    }

    editorTextarea.setRangeText(replacement, start, end, 'end');
    editorTextarea.setSelectionRange(selStart, selEnd);
    editorTextarea.focus();
    renderPreview();
    updateToolbarStates();
  }

  document.querySelectorAll('.tw-key[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      applyFormat(cmd);
    });
  });

  // Actions
  btnExportMd.addEventListener('click', () => {
    playKeyClickSound();
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

    showToast(`Skrivemaskine notat gemt som: ${filename}`, 'download');
  });

  btnCopyMd.addEventListener('click', () => {
    playKeyClickSound();
    const markdownContent = generateFullMarkdown();
    navigator.clipboard.writeText(markdownContent).then(() => {
      showToast('Skrivemaskinetekst kopieret til udklipsholder!', 'copy');
    });
  });

  btnClear.addEventListener('click', () => {
    playKeyClickSound();
    if (confirm('Vil du rydde papirarket?')) {
      docTitleInput.value = '';
      docCategoriesInput.value = '';
      editorTextarea.value = '';
      try {
        localStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
      } catch (e) {}
      renderPreview();
      showToast('Papir ryddet', 'trash-2');
    }
  });

  // Save draft when clicking to switch to standard app
  const btnSwitchMode = document.querySelector('a[href="index.html"]');
  if (btnSwitchMode) {
    btnSwitchMode.addEventListener('click', (e) => {
      e.preventDefault();
      navigateWithDraft('index.html');
    });
  }

  // Quick Chips Actions for Metadata Input
  function getFormattedDanishDate() {
    const today = new Date();
    const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
    return `${today.getDate()}. ${months[today.getMonth()]} ${today.getFullYear()}`;
  }

  function appendCategoryTag(tagLabel) {
    if (!docCategoriesInput) return;
    if (!docCategoriesInput.value) {
      docCategoriesInput.value = tagLabel;
    } else {
      const current = docCategoriesInput.value.trim();
      docCategoriesInput.value = current ? `${current} | ${tagLabel}` : tagLabel;
    }
    docCategoriesInput.focus();
    renderPreview();
  }

  if (chipDate) {
    chipDate.addEventListener('click', () => {
      playKeyClickSound();
      appendCategoryTag(`Dato: ${getFormattedDanishDate()}`);
      showToast('Dags dato tilføjet', 'calendar');
    });
  }

  if (chipLocation) {
    chipLocation.addEventListener('click', () => {
      playKeyClickSound();
      if (!navigator.geolocation) {
        appendCategoryTag('Sted: ');
        return;
      }
      showToast('Søger efter placering...', 'map-pin');
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
              appendCategoryTag(locationStr);
              showToast('Placering tilføjet', 'map-pin');
            } else {
              appendCategoryTag('Sted: ');
            }
          } catch (e) {
            appendCategoryTag('Sted: ');
          }
        },
        () => {
          appendCategoryTag('Sted: ');
        },
        { timeout: 7000 }
      );
    });
  }

  if (chipNoteNo) {
    chipNoteNo.addEventListener('click', () => {
      playKeyClickSound();
      appendCategoryTag('Tags: ');
      showToast('Tags skabelon tilføjet', 'tag');
    });
  }

  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', () => {
      playBellSound();
      docTitleInput.value = sampleData.title;
      docCategoriesInput.value = sampleData.categories;
      editorTextarea.value = sampleData.body;
      renderPreview();
      showToast('Eksempel (Møns Klint) indlæst på skrivemaskinen!', 'file-text');
    });
  }

  // ----------------------------------------------------
  // FULLSCREEN & DISTRACTION-FREE MODE LOGIC
  // ----------------------------------------------------
  function toggleFullscreen() {
    playKeyClickSound();
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('distraction-free-mode'));
    
    if (!isFullscreen) {
      // Enter Fullscreen & Distraction-Free mode
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen().catch(() => {});
      }
      document.body.classList.add('distraction-free-mode');
      if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
      if (btnFullscreen) {
        btnFullscreen.classList.add('active');
        btnFullscreen.setAttribute('title', 'Forlad Fuldskærm (Alt+F eller ESC)');
      }
      showToast('Fuldskærm & Distraktionsfri Skrivemodus Aktiveret', 'maximize');
    } else {
      // Exit Fullscreen & Distraction-Free mode
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
      document.body.classList.remove('distraction-free-mode');
      if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
      if (btnFullscreen) {
        btnFullscreen.classList.remove('active');
        btnFullscreen.setAttribute('title', 'Fuldskærm / Distraktionsfri Skrivemodus (Alt+F eller ESC)');
      }
      showToast('Forladt Fuldskærm', 'minimize-2');
    }

    if (window.feather) {
      setTimeout(() => feather.replace(), 50);
    }
  }

  function handleFullscreenChange() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFs) {
      document.body.classList.remove('distraction-free-mode');
      if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
      if (btnFullscreen) {
        btnFullscreen.classList.remove('active');
      }
    } else {
      document.body.classList.add('distraction-free-mode');
      if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
      if (btnFullscreen) {
        btnFullscreen.classList.add('active');
      }
    }
    if (window.feather) {
      setTimeout(() => feather.replace(), 50);
    }
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
  }
  if (floatingExitFs) {
    floatingExitFs.addEventListener('click', toggleFullscreen);
  }

  // Export Dropdown Toggle Logic
  if (btnExportMenu && exportDropdown) {
    btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      exportDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!exportDropdown.contains(e.target)) {
        exportDropdown.classList.remove('open');
      }
    });
  }

  // Print / PDF Export Action
  function triggerPdfPrint() {
    if (exportDropdown) exportDropdown.classList.remove('open');
    renderPreview();
    window.print();
  }

  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', triggerPdfPrint);
  }

  window.addEventListener('beforeprint', renderPreview);

  if (btnCopyMdDropdown) {
    btnCopyMdDropdown.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.classList.remove('open');
      btnCopyMd.click();
    });
  }

  // Keyboard Shortcuts Modal Toggle
  function openShortcutModal() {
    if (shortcutModal) {
      shortcutModal.classList.remove('hidden');
    }
  }

  function closeShortcutModal() {
    if (shortcutModal) {
      shortcutModal.classList.add('hidden');
    }
  }

  if (btnShortcuts) {
    btnShortcuts.addEventListener('click', openShortcutModal);
  }

  if (btnCloseShortcutModal) {
    btnCloseShortcutModal.addEventListener('click', closeShortcutModal);
  }

  if (shortcutModal) {
    shortcutModal.addEventListener('click', (e) => {
      if (e.target === shortcutModal) {
        closeShortcutModal();
      }
    });
  }

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

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (fKeyMap[e.key]) {
      e.preventDefault();
      const btn = document.querySelector(`[data-cmd="${fKeyMap[e.key]}"]`);
      if (btn) btn.click();
      return;
    }

    if (e.key === 'Escape') {
      closeShortcutModal();
      if (exportDropdown) exportDropdown.classList.remove('open');
      return;
    }

    const isInputActive = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

    if (e.key === '?' && !isInputActive) {
      e.preventDefault();
      openShortcutModal();
      return;
    }

    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (btnExportMd) btnExportMd.click();
      } else if (key === 'p' && !e.shiftKey) {
        e.preventDefault();
        window.print();
      } else if (key === '/') {
        e.preventDefault();
        if (shortcutModal && !shortcutModal.classList.contains('hidden')) {
          closeShortcutModal();
        } else {
          openShortcutModal();
        }
      }
    }
  });

  document.addEventListener('selectionchange', updateToolbarStates);

  function handleTypingSound(e) {
    if (!soundEnabled) return;
    if (e.key === 'Enter') {
      playBellSound();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      playBackspaceSound();
    } else if (e.key === ' ' || e.code === 'Space') {
      playSpaceSound();
    } else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      playKeyClickSound();
    }
  }

  [editorTextarea, docTitleInput, docCategoriesInput].forEach(inputEl => {
    if (inputEl) {
      inputEl.addEventListener('keydown', handleTypingSound);
    }
  });

  if (editorTextarea) {
    editorTextarea.addEventListener('keyup', updateToolbarStates);
    editorTextarea.addEventListener('click', updateToolbarStates);
    editorTextarea.addEventListener('input', () => {
      autoResizeTextarea();
      renderPreview();
    });
    editorTextarea.addEventListener('paste', () => {
      setTimeout(() => {
        autoResizeTextarea();
        renderPreview();
      }, 20);
    });

    const paperWrapperEl = document.querySelector('.paper-wrapper');
    if (paperWrapperEl) {
      editorTextarea.addEventListener('wheel', (e) => {
        paperWrapperEl.scrollTop += e.deltaY;
      }, { passive: true });
    }
  }

  window.addEventListener('resize', autoResizeTextarea);

  // Drag & Drop File Loader
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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

  function parseAndLoadMdFile(fileName, content) {
    const lines = content.split('\n');
    let title = '';
    let categories = '';
    let lineIdx = 0;

    if (lines.length > 0 && lines[0].startsWith('# ')) {
      title = lines[0].substring(2).trim();
      lineIdx++;
      if (lineIdx < lines.length && lines[lineIdx].trim() === '') lineIdx++;
    }

    if (lineIdx < lines.length && lines[lineIdx].startsWith('*') && lines[lineIdx].endsWith('*') && !lines[lineIdx].startsWith('**')) {
      categories = lines[lineIdx].substring(1, lines[lineIdx].length - 1).trim();
      lineIdx++;
      if (lineIdx < lines.length && lines[lineIdx].trim() === '') lineIdx++;
    }

    const bodyText = lines.slice(lineIdx).join('\n');

    if (docTitleInput) docTitleInput.value = title;
    if (docCategoriesInput) docCategoriesInput.value = categories;
    if (editorTextarea) editorTextarea.value = bodyText;

    renderPreview();
    autoResizeTextarea();
    showToast(`"${fileName}" indlæst på skrivemaskinen!`, 'file-text');
  }

  // Startup Init
  updateSoundUI();
  loadDraft();
  renderPreview();
  autoResizeTextarea();
  preloadRealWavSounds();
});
