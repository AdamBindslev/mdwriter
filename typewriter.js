// Flowscribe — Typewriter Edition (Skrivemaskine Udgave)
// Modularized with MDCore while preserving mechanical audio & typewriter feel

document.addEventListener('DOMContentLoaded', () => {
  const { Storage, Stats, Markdown, Formatter, Export } = window.MDCore || {};

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
    keys: [],
    space: null,
    enter: null,
    backspace: null
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

  ['click', 'keydown', 'mousedown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      initAudio();
    }, { once: false, passive: true });
  });

  async function loadWavSample(url) {
    try {
      initAudio();
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
        source.playbackRate.value = 0.94 + Math.random() * 0.12;
        gainNode.gain.value = 0.9 + Math.random() * 0.2;
        source.connect(gainNode);
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

  // Synthesize / Play Realistic Vintage Typewriter Key Strike
  function playKeyClickSound() {
    if (!soundEnabled) return;
    initAudio();

    // 1. Try real .wav sample if available
    if (soundBuffers.keys.length > 0) {
      let idx = Math.floor(Math.random() * soundBuffers.keys.length);
      if (soundBuffers.keys.length > 1 && idx === lastKeyIndex && Math.random() > 0.3) {
        idx = (idx + 1) % soundBuffers.keys.length;
      }
      lastKeyIndex = idx;
      const selectedBuf = soundBuffers.keys[idx];
      if (playSample(selectedBuf, true, true)) return;
    }

    // 2. High-Fidelity Procedural Web Audio Synthesizer
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const pitchVar = 0.92 + Math.random() * 0.18;
      const gainVar = 0.85 + Math.random() * 0.25;

      // Layer 1: Metal Type-Bar Strike (High-speed noise burst through resonant bandpass)
      const noiseLen = 0.032;
      const bufSize = Math.floor(audioCtx.sampleRate * noiseLen);
      const noiseBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const out = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        out[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.28));
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuf;

      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime((2600 + Math.random() * 500) * pitchVar, now);
      bandpass.Q.setValueAtTime(4.2, now);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.45 * gainVar, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseLen);

      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start(now);

      // Layer 2: Metallic Lever Snap (Triangle frequency sweep)
      const oscSnap = audioCtx.createOscillator();
      const snapGain = audioCtx.createGain();
      oscSnap.type = 'triangle';
      oscSnap.frequency.setValueAtTime(1500 * pitchVar, now);
      oscSnap.frequency.exponentialRampToValueAtTime(320, now + 0.022);

      snapGain.gain.setValueAtTime(0.35 * gainVar, now);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

      oscSnap.connect(snapGain);
      snapGain.connect(audioCtx.destination);
      oscSnap.start(now);
      oscSnap.stop(now + 0.022);

      // Layer 3: Heavy Platen / Roller Body Resonance (Low sine thud)
      const oscBody = audioCtx.createOscillator();
      const bodyGain = audioCtx.createGain();
      oscBody.type = 'sine';
      oscBody.frequency.setValueAtTime(260 * pitchVar, now);
      oscBody.frequency.exponentialRampToValueAtTime(65, now + 0.028);

      bodyGain.gain.setValueAtTime(0.3 * gainVar, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

      oscBody.connect(bodyGain);
      bodyGain.connect(audioCtx.destination);
      oscBody.start(now);
      oscBody.stop(now + 0.028);

      // Layer 4: Subtle Spring Ringing (Metallic ping overtone)
      const oscRing = audioCtx.createOscillator();
      const ringGain = audioCtx.createGain();
      oscRing.type = 'sine';
      oscRing.frequency.setValueAtTime((3800 + Math.random() * 400) * pitchVar, now);

      ringGain.gain.setValueAtTime(0.08 * gainVar, now);
      ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      oscRing.connect(ringGain);
      ringGain.connect(audioCtx.destination);
      oscRing.start(now);
      oscRing.stop(now + 0.04);
    } catch (e) {}
  }

  // Synthesize / Play Spacebar (Heavy mechanical carriage bar impact + spring release)
  function playSpaceSound() {
    if (!soundEnabled) return;
    initAudio();

    if (soundBuffers.space) {
      if (playSample(soundBuffers.space, false)) return;
    }

    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const pitchVar = 0.95 + Math.random() * 0.1;

      // 1. Heavy wooden / metal platen impact
      const body = audioCtx.createOscillator();
      const bodyGain = audioCtx.createGain();
      body.type = 'sine';
      body.frequency.setValueAtTime(170 * pitchVar, now);
      body.frequency.exponentialRampToValueAtTime(40, now + 0.065);

      bodyGain.gain.setValueAtTime(0.55, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      body.connect(bodyGain);
      bodyGain.connect(audioCtx.destination);
      body.start(now);
      body.stop(now + 0.065);

      // 2. Soft mechanical escapement bar friction
      const noiseLen = 0.035;
      const bufSize = Math.floor(audioCtx.sampleRate * noiseLen);
      const noiseBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const out = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        out[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.28, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseLen);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start(now);
    } catch (e) {}
  }

  function playRatchetClick(t, pitchMult = 1.0) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(820 * pitchMult, t);
    osc.frequency.exponentialRampToValueAtTime(220 * pitchMult, t + 0.014);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.014);
  }

  // Synthesize / Play Backspace (Escapement gear reverse click)
  function playBackspaceSound() {
    if (!soundEnabled) return;
    initAudio();

    if (soundBuffers.backspace) {
      if (playSample(soundBuffers.backspace, false)) return;
    }

    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      playRatchetClick(now, 1.05);
      playRatchetClick(now + 0.018, 0.95);
    } catch (e) {}
  }

  // Synthesize / Play Vintage Typewriter Carriage Return Bell ("Ding!") + Slide
  function playBellSound() {
    if (!soundEnabled) return;
    initAudio();

    if (soundBuffers.enter) {
      if (playSample(soundBuffers.enter, false)) return;
    }

    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;

      // 1. High Metallic Bell Chime (Pure sine 2650Hz with natural resonant decay)
      const bell = audioCtx.createOscillator();
      const bellGain = audioCtx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(2650, now);

      bellGain.gain.setValueAtTime(0.55, now);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      bell.connect(bellGain);
      bellGain.connect(audioCtx.destination);
      bell.start(now);
      bell.stop(now + 1.2);

      // 2. Harmonic Overtone (5300Hz)
      const overtone = audioCtx.createOscillator();
      const overtoneGain = audioCtx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(5300, now);

      overtoneGain.gain.setValueAtTime(0.22, now);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      overtone.connect(overtoneGain);
      overtoneGain.connect(audioCtx.destination);
      overtone.start(now);
      overtone.stop(now + 0.55);

      // 3. Warm Under-tone Resonance (1325Hz)
      const undertone = audioCtx.createOscillator();
      const underGain = audioCtx.createGain();
      undertone.type = 'sine';
      undertone.frequency.setValueAtTime(1325, now);

      underGain.gain.setValueAtTime(0.15, now);
      underGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      undertone.connect(underGain);
      underGain.connect(audioCtx.destination);
      undertone.start(now);
      undertone.stop(now + 0.35);

      // 4. Mechanical Carriage Return Ratchet Slide (4 rapid tooth-clicks)
      for (let i = 0; i < 4; i++) {
        playRatchetClick(now + 0.08 + i * 0.026, 1.0 - i * 0.03);
      }
    } catch (e) {}
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

  btnSoundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    try {
      localStorage.setItem(SOUND_KEY, soundEnabled);
    } catch (e) {}
    updateSoundUI();
    showToast(soundEnabled ? 'Skrivemaskinelyd Aktiveret' : 'Mekanisk lyd slået fra');
    if (soundEnabled) playKeyClickSound();
  });

  // Ribbon Color Switcher
  ribbonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ribbonBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ribbonColor = btn.getAttribute('data-ribbon');
      document.documentElement.setAttribute('data-ribbon', ribbonColor);
      playKeyClickSound();
    });
  });

  // Tab View Switch (Paper vs Rendered)
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

  function autoResizeTextarea() {
    if (!editorTextarea) return;
    editorTextarea.style.height = '0px';
    const scrollH = editorTextarea.scrollHeight;
    editorTextarea.style.height = Math.max(500, scrollH + 40) + 'px';
  }

  function updateOdometer() {
    const fullMarkdown = Storage ? Storage.generateFullMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value) : editorTextarea.value;
    const stats = Stats ? Stats.calculateStats(fullMarkdown) : { words: 0, chars: 0, lines: 0, readTimeMins: 1 };
    const formatted = Stats ? Stats.formatStats(stats) : {};

    const padded = String(stats.words).padStart(5, '0').slice(-5);
    const digits = padded.split('');
    if (odometerWords) {
      odometerWords.innerHTML = digits.map(d => `<span class="digit">${d}</span>`).join('');
    }
    if (statChars) statChars.textContent = formatted.charsText || `${stats.chars} tegn`;
    if (statLines) statLines.textContent = formatted.linesText || `${stats.lines} linjer`;
    if (statReadTime) statReadTime.textContent = formatted.readTimeText || `ca. ${stats.readTimeMins} min læsetid`;

    if (filenamePreview && Storage) {
      filenamePreview.textContent = Storage.getExportFilename(docTitleInput.value, 'md');
    }
  }

  function renderPreview() {
    const fullMarkdown = Storage ? Storage.generateFullMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value) : editorTextarea.value;

    if (Markdown && previewContainer) {
      Markdown.renderPreview(fullMarkdown, previewContainer, false);
    }

    autoResizeTextarea();
    updateOdometer();

    if (Storage) {
      Storage.saveDraft({
        title: docTitleInput ? docTitleInput.value : '',
        categories: docCategoriesInput ? docCategoriesInput.value : '',
        body: editorTextarea ? editorTextarea.value : ''
      });
    }
  }

  function showToast(message, icon = 'check-circle') {
    if (!toast) return;
    toast.innerHTML = `<i data-feather="${icon}"></i> <span>${message}</span>`;
    if (window.feather) feather.replace();
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function updateToolbarStates() {
    if (Formatter && editorTextarea) {
      Formatter.updateToolbarStates(editorTextarea, '.tw-key[data-cmd]');
    }
  }

  document.querySelectorAll('.tw-key[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      playKeyClickSound();
      if (Formatter) {
        Formatter.applyFormat(cmd, editorTextarea, () => {
          renderPreview();
          updateToolbarStates();
        });
      }
    });
  });

  // Export Actions
  if (btnExportMd) {
    btnExportMd.addEventListener('click', () => {
      playKeyClickSound();
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) {
        const filename = Export.exportMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value);
        showToast(`Skrivemaskine notat gemt som: ${filename}`, 'download');
      }
    });
  }

  if (btnCopyMd) {
    btnCopyMd.addEventListener('click', async () => {
      playKeyClickSound();
      if (Export) {
        try {
          await Export.copyMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value);
          showToast('Skrivemaskinetekst kopieret til udklipsholder!', 'copy');
        } catch (e) {}
      }
    });
  }

  if (btnCopyMdDropdown) {
    btnCopyMdDropdown.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (btnCopyMd) btnCopyMd.click();
    });
  }

  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) Export.triggerPdfPrint(renderPreview);
    });
  }

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

  // Clear Action
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      playKeyClickSound();
      if (confirm('Vil du rydde papirarket?')) {
        docTitleInput.value = '';
        docCategoriesInput.value = '';
        editorTextarea.value = '';
        if (Storage) Storage.clearDraft();
        renderPreview();
        showToast('Papir ryddet', 'trash-2');
      }
    });
  }

  // Quick Chips
  if (chipDate) {
    chipDate.addEventListener('click', () => {
      playKeyClickSound();
      if (Formatter && Storage) {
        Formatter.appendCategoryTag(docCategoriesInput, `Dato: ${Storage.getFormattedDanishDate()}`, renderPreview);
        showToast('Dags dato tilføjet', 'calendar');
      }
    });
  }

  if (chipLocation) {
    chipLocation.addEventListener('click', () => {
      playKeyClickSound();
      if (Formatter) {
        showToast('Søger efter placering...', 'map-pin');
        Formatter.fetchLocation(
          (locStr) => {
            Formatter.appendCategoryTag(docCategoriesInput, locStr, renderPreview);
            showToast('Placering tilføjet', 'map-pin');
          },
          () => {
            Formatter.appendCategoryTag(docCategoriesInput, 'Sted: ', renderPreview);
          }
        );
      }
    });
  }

  if (chipNoteNo) {
    chipNoteNo.addEventListener('click', () => {
      playKeyClickSound();
      if (Formatter) {
        Formatter.appendCategoryTag(docCategoriesInput, 'Tags: ', renderPreview);
        showToast('Tags skabelon tilføjet', 'tag');
      }
    });
  }

  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', () => {
      playBellSound();
      if (Storage && Storage.sampleData) {
        docTitleInput.value = Storage.sampleData.title;
        docCategoriesInput.value = Storage.sampleData.categories;
        editorTextarea.value = Storage.sampleData.body;
        renderPreview();
        showToast('Eksempel (Møns Klint) indlæst på skrivemaskinen!', 'file-text');
      }
    });
  }

  // Mode Switch Navigation Links (Pass active draft to other editions)
  document.querySelectorAll('.mode-toggle-group a, .view-toggle-group a, a[href="index.html"], a[href="terminal.html"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (Storage) {
        Storage.navigateWithDraft(href, {
          title: docTitleInput ? docTitleInput.value : '',
          categories: docCategoriesInput ? docCategoriesInput.value : '',
          body: editorTextarea ? editorTextarea.value : ''
        });
      } else {
        window.location.href = href;
      }
    });
  });

  // Typing Audio Trigger
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
  document.addEventListener('selectionchange', updateToolbarStates);

  // Drag & Drop Import
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          if (Storage) {
            const parsed = Storage.parseAndLoadMdFile(file.name, content);
            docTitleInput.value = parsed.title;
            docCategoriesInput.value = parsed.categories;
            editorTextarea.value = parsed.body;
            renderPreview();
            autoResizeTextarea();
            showToast(`"${file.name}" indlæst på skrivemaskinen!`, 'file-text');
          }
        };
        reader.readAsText(file);
      } else {
        showToast('Venligst upload en .md eller .txt fil', 'alert-circle');
      }
    }
  });

  // Fullscreen & Distraction-Free Mode
  function toggleFullscreen() {
    playKeyClickSound();
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('distraction-free-mode'));

    if (!isFullscreen) {
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

  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);
  if (floatingExitFs) floatingExitFs.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFs) {
      document.body.classList.remove('distraction-free-mode');
      if (btnFullscreen) btnFullscreen.classList.remove('active');
    } else {
      document.body.classList.add('distraction-free-mode');
      if (btnFullscreen) btnFullscreen.classList.add('active');
    }
    if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
  });

  // Keyboard Shortcuts Modal Toggle
  function openShortcutModal() {
    if (shortcutModal) shortcutModal.classList.remove('hidden');
  }

  function closeShortcutModal() {
    if (shortcutModal) shortcutModal.classList.add('hidden');
  }

  if (btnShortcuts) btnShortcuts.addEventListener('click', openShortcutModal);
  if (btnCloseShortcutModal) btnCloseShortcutModal.addEventListener('click', closeShortcutModal);
  if (shortcutModal) {
    shortcutModal.addEventListener('click', (e) => {
      if (e.target === shortcutModal) closeShortcutModal();
    });
  }

  // Global Shortcuts
  document.addEventListener('keydown', (e) => {
    if (Formatter && Formatter.fKeyMap[e.key]) {
      e.preventDefault();
      const btn = document.querySelector(`[data-cmd="${Formatter.fKeyMap[e.key]}"]`);
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

  // Initial Load Pipeline
  updateSoundUI();
  if (Storage) {
    const savedDraft = Storage.loadDraft();
    if (savedDraft) {
      if (docTitleInput && savedDraft.title !== undefined) docTitleInput.value = savedDraft.title;
      if (docCategoriesInput && savedDraft.categories !== undefined) docCategoriesInput.value = savedDraft.categories;
      if (editorTextarea && savedDraft.body !== undefined) editorTextarea.value = savedDraft.body;
    }
  }

  renderPreview();
  autoResizeTextarea();
  preloadRealWavSounds();
});
