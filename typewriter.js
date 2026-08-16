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
  const ribbonBtns = document.querySelectorAll('.ribbon-btn');

  // Chips
  const chipDate = document.getElementById('chipDate');
  const chipLocation = document.getElementById('chipLocation');
  const chipNoteNo = document.getElementById('chipNoteNo');

  // Actions
  const btnExportMd = document.getElementById('btnExportMd');
  const btnCopyMd = document.getElementById('btnCopyMd');
  const btnClear = document.getElementById('btnClear');
  const btnLoadSample = document.getElementById('btnLoadSample');
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

  // Sample Data (Møns Klint Field Diary)
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

  // ----------------------------------------------------
  // WEB AUDIO API — Typewriter Sound Synthesizer
  // ----------------------------------------------------
  let soundEnabled = true;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
  }

  // Synthesize Key Click ("Clack")
  function playKeyClickSound() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      // Noise buffer for mechanical clack
      const bufferSize = audioCtx.sampleRate * 0.03; // 30ms
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter for crisp metal/wood hit
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800 + Math.random() * 400, now);
      filter.Q.setValueAtTime(3, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start(now);
    } catch (e) {
      console.error(e);
    }
  }

  // Synthesize Spacebar Heavy Thud
  function playSpaceSound() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.error(e);
    }
  }

  // Synthesize Carriage Return Bell ("Ding!")
  function playBellSound() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, now); // Metallic high bell pitch

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.error(e);
    }
  }

  // Toggle Sound FX
  btnSoundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    btnSoundToggle.classList.toggle('active', soundEnabled);
    soundIcon.setAttribute('data-feather', soundEnabled ? 'volume-2' : 'volume-x');
    if (window.feather) feather.replace();
    showToast(soundEnabled ? 'Skrivemaskinelyd Aktiveret' : 'Mekanisk lyd slået fra');
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

  function renderPreview() {
    const markdownText = generateFullMarkdown();

    if (window.marked && window.DOMPurify) {
      const rawHtml = marked.parse(markdownText);
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      previewContainer.innerHTML = cleanHtml;
    } else {
      previewContainer.textContent = markdownText;
    }

    updateOdometer();
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

  // ----------------------------------------------------
  // Mechanical Key Events & Audio Feedback
  // ----------------------------------------------------
  editorTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      playBellSound();
    } else if (e.key === ' ') {
      playSpaceSound();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      playKeyClickSound();
    }
  });

  docTitleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      playBellSound();
    } else if (e.key === ' ') {
      playSpaceSound();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      playKeyClickSound();
    }
  });

  docCategoriesInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      playBellSound();
    } else if (e.key === ' ') {
      playSpaceSound();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      playKeyClickSound();
    }
  });

  // Realtime Render & Odometer Update
  editorTextarea.addEventListener('input', renderPreview);
  docTitleInput.addEventListener('input', renderPreview);
  docCategoriesInput.addEventListener('input', renderPreview);

  // Quick Chips
  function appendCategoryTag(tagLabel) {
    playKeyClickSound();
    if (!docCategoriesInput.value) {
      docCategoriesInput.value = tagLabel;
    } else {
      const current = docCategoriesInput.value.trim();
      docCategoriesInput.value = current ? `${current} | ${tagLabel}` : tagLabel;
    }
    docCategoriesInput.focus();
    renderPreview();
  }

  chipDate.addEventListener('click', () => appendCategoryTag('Dato: '));
  chipLocation.addEventListener('click', () => appendCategoryTag('Sted: '));
  chipNoteNo.addEventListener('click', () => appendCategoryTag('Notat #: '));

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
        replacement = selectedText ? selectedText.split('\n').map(l => `- ${l}`).join('\n') : `- Punkt 1\n- Punkt 2`;
        selStart = start;
        selEnd = start + replacement.length;
        break;
      case 'ol':
        replacement = selectedText ? selectedText.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') : `1. Første punkt\n2. Andet punkt`;
        selStart = start;
        selEnd = start + replacement.length;
        break;
      case 'task':
        replacement = selectedText ? selectedText.split('\n').map(l => `- [ ] ${l}`).join('\n') : `- [ ] Opgave 1`;
        selStart = start;
        selEnd = start + replacement.length;
        break;
    }

    editorTextarea.setRangeText(replacement, start, end, 'end');
    editorTextarea.setSelectionRange(selStart, selEnd);
    editorTextarea.focus();
    renderPreview();
  }

  document.querySelectorAll('.tw-key[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
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
      renderPreview();
      showToast('Papirryddet', 'trash-2');
    }
  });

  btnLoadSample.addEventListener('click', () => {
    playBellSound();
    docTitleInput.value = sampleData.title;
    docCategoriesInput.value = sampleData.categories;
    editorTextarea.value = sampleData.body;
    renderPreview();
    showToast('Eksempel (Møns Klint) indlæst på skrivemaskinen!', 'file-text');
  });

  // Startup Init
  docTitleInput.value = '';
  docCategoriesInput.value = '';
  editorTextarea.value = '';
  renderPreview();
});
