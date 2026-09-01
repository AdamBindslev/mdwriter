// Flowscribe — Terminal Edition (CRT Matrix / Wargames)
// Modularized with MDCore while preserving CRT visual effects & keyboard sounds

document.addEventListener('DOMContentLoaded', () => {
  const { Storage, Stats, Markdown, Formatter, Export } = window.MDCore || {};

  // Initialize Feather Icons
  if (window.feather) {
    feather.replace();
  }

  // Local Storage Keys for Terminal-Specific Settings
  const THEME_KEY = 'md_writer_crt_theme';
  const FX_KEY = 'md_writer_crt_fx';
  const SOUND_KEY = 'md_writer_terminal_sound';
  const VALID_THEMES = ['matrix', 'wargames', 'cyan', 'monochrome'];

  // Safe localStorage helper functions to protect against corrupted storage
  function safeGetStorage(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function safeGetStorageJSON(key, fallback = {}) {
    try {
      const val = localStorage.getItem(key);
      if (!val) return fallback;
      const parsed = JSON.parse(val);
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  // DOM Element References
  const html = document.documentElement;
  const docTitleInput = document.getElementById('docTitle');
  const docCategoriesInput = document.getElementById('docCategories');
  const editorTextarea = document.getElementById('editorTextarea');
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
  const btnMidlineToggle = document.getElementById('btnMidlineToggle');
  const midlineIcon = document.getElementById('midlineIcon');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const fullscreenIcon = document.getElementById('fullscreenIcon');
  const floatingExitFs = document.getElementById('floatingExitFs');

  // Midline / Centered Typewriter Scroll State
  const MIDLINE_KEY = 'md_writer_terminal_midline_scroll';
  let midlineEnabled = true;
  const savedMidline = safeGetStorage(MIDLINE_KEY);
  if (savedMidline !== null) {
    midlineEnabled = savedMidline === 'true';
  }

  function updateMidlineUI() {
    if (btnMidlineToggle) {
      btnMidlineToggle.classList.toggle('active', midlineEnabled);
      btnMidlineToggle.setAttribute(
        'title',
        midlineEnabled
          ? 'Centreret Rulning aktiv (Aktiv linje fastholdes på midten af skærmen)'
          : 'Standard rulning (Midterlinje slået fra)'
      );
    }
  }

  if (btnMidlineToggle) {
    btnMidlineToggle.addEventListener('click', () => {
      midlineEnabled = !midlineEnabled;
      try {
        localStorage.setItem(MIDLINE_KEY, midlineEnabled);
      } catch (e) {}
      updateMidlineUI();
      showToast(
        midlineEnabled ? 'MIDTERLINJE: AKTIVERET' : 'MIDTERLINJE: DEAKTIVERET'
      );
      playTerminalTypingSound('char');
      if (midlineEnabled) {
        scrollTerminalToCenter(true);
      }
    });
  }

  // ----------------------------------------------------
  // MID-SCREEN CENTERED SCROLLING SYSTEM (TERMINAL)
  // ----------------------------------------------------
  const mirrorProperties = [
    'direction', 'boxSizing', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch',
    'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily',
    'textAlign', 'textTransform', 'textIndent', 'textDecoration',
    'letterSpacing', 'wordSpacing', 'tabSize', 'MozTabSize'
  ];

  let mirrorDiv = null;

  function getCaretCoordinates(element, position) {
    if (!mirrorDiv) {
      mirrorDiv = document.createElement('div');
      mirrorDiv.id = 'term-caret-mirror';
      document.body.appendChild(mirrorDiv);
    }

    const style = mirrorDiv.style;
    const computed = window.getComputedStyle(element);

    style.whiteSpace = 'pre-wrap';
    style.wordWrap = 'break-word';
    style.overflowWrap = 'break-word';
    style.position = 'fixed';
    style.top = '-9999px';
    style.left = '-9999px';
    style.visibility = 'hidden';
    style.pointerEvents = 'none';

    mirrorProperties.forEach(prop => {
      style[prop] = computed[prop];
    });

    style.width = computed.width;

    const textBefore = element.value.substring(0, position);
    mirrorDiv.textContent = textBefore;

    const marker = document.createElement('span');
    marker.textContent = element.value.substring(position, position + 1) || ' ';
    if (marker.textContent === '\n') marker.textContent = ' ';
    mirrorDiv.appendChild(marker);

    return {
      top: marker.offsetTop + parseInt(computed.borderTopWidth || 0, 10),
      left: marker.offsetLeft + parseInt(computed.borderLeftWidth || 0, 10),
      height: marker.offsetHeight || parseInt(computed.lineHeight || 24, 10)
    };
  }

  let scrollRaf = null;

  function scrollTerminalToCenter(smooth = true) {
    if (!midlineEnabled || !editorTextarea) return;
    if (editorView && editorView.classList.contains('hidden')) return;

    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(() => {
      const cursorPos = editorTextarea.selectionStart || 0;
      const caret = getCaretCoordinates(editorTextarea, cursorPos);

      // Desired position: active line at ~45% from top of editor textarea viewport
      const targetViewportY = editorTextarea.clientHeight * 0.45;
      const targetScrollTop = Math.max(0, Math.round(caret.top - targetViewportY));

      const diff = Math.abs(editorTextarea.scrollTop - targetScrollTop);
      if (diff > 4) {
        if (smooth) {
          editorTextarea.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        } else {
          editorTextarea.scrollTop = targetScrollTop;
        }
      }
    });
  }

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
  const btnShortcuts = document.getElementById('btnShortcuts');
  const shortcutModal = document.getElementById('shortcutModal');
  const btnCloseShortcutModal = document.getElementById('btnCloseShortcutModal');
  const toast = document.getElementById('toast');

  // Stats Counters
  const statWords = document.getElementById('statWords');
  const statChars = document.getElementById('statChars');
  const statLines = document.getElementById('statLines');
  const statReadTime = document.getElementById('statReadTime');

  // ----------------------------------------------------
  // DIGITAL RETRO TERMINAL WEB AUDIO SYNTHESIZER
  // ----------------------------------------------------
  let soundEnabled = true;
  let audioCtx = null;

  const savedSound = safeGetStorage(SOUND_KEY);
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
    if (btnSoundToggle) {
      btnSoundToggle.classList.toggle('active', soundEnabled);
      btnSoundToggle.setAttribute('title', soundEnabled ? 'Terminal lyd slået til' : 'Terminal lyd slået fra');
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
    if (soundEnabled) playTerminalTypingSound('char');
  });

  function playTerminalTypingSound(type = 'char') {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;

      if (type === 'char') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const freq = 1600 + Math.random() * 800;
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
    } catch (e) {}
  }

  // ----------------------------------------------------
  // CRT THEMES & EFFECTS MANAGEMENT
  // ----------------------------------------------------
  const rawTheme = safeGetStorage(THEME_KEY, 'matrix');
  const savedTheme = VALID_THEMES.includes(rawTheme) ? rawTheme : 'matrix';
  setCRTTheme(savedTheme);

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      if (VALID_THEMES.includes(theme)) {
        setCRTTheme(theme);
      }
    });
  });

  function setCRTTheme(theme) {
    const activeTheme = VALID_THEMES.includes(theme) ? theme : 'matrix';
    html.setAttribute('data-crt-theme', activeTheme);
    try {
      localStorage.setItem(THEME_KEY, activeTheme);
    } catch (e) {}
    themeBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-theme') === activeTheme);
    });
  }

  const savedFX = safeGetStorageJSON(FX_KEY, {});
  const fxState = {
    scanlines: typeof savedFX.scanlines === 'boolean' ? savedFX.scanlines : true,
    curved: typeof savedFX.curved === 'boolean' ? savedFX.curved : true,
    glow: typeof savedFX.glow === 'boolean' ? savedFX.glow : true,
    flicker: typeof savedFX.flicker === 'boolean' ? savedFX.flicker : false
  };

  applyFXState();

  function applyFXState() {
    html.setAttribute('data-scanlines', fxState.scanlines);
    html.setAttribute('data-curved', fxState.curved);
    html.setAttribute('data-glow', fxState.glow);
    html.setAttribute('data-flicker', fxState.flicker);

    if (btnToggleScanlines) btnToggleScanlines.classList.toggle('active', fxState.scanlines);
    if (btnToggleCurved) btnToggleCurved.classList.toggle('active', fxState.curved);
    if (btnToggleGlow) btnToggleGlow.classList.toggle('active', fxState.glow);
    if (btnToggleFlicker) btnToggleFlicker.classList.toggle('active', fxState.flicker);

    try {
      localStorage.setItem(FX_KEY, JSON.stringify(fxState));
    } catch (e) {}
  }

  if (btnToggleScanlines) {
    btnToggleScanlines.addEventListener('click', () => {
      fxState.scanlines = !fxState.scanlines;
      applyFXState();
    });
  }
  if (btnToggleCurved) {
    btnToggleCurved.addEventListener('click', () => {
      fxState.curved = !fxState.curved;
      applyFXState();
    });
  }
  if (btnToggleGlow) {
    btnToggleGlow.addEventListener('click', () => {
      fxState.glow = !fxState.glow;
      applyFXState();
    });
  }
  if (btnToggleFlicker) {
    btnToggleFlicker.addEventListener('click', () => {
      fxState.flicker = !fxState.flicker;
      applyFXState();
    });
  }

  // Real-time Digital Clock
  function updateClock() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    if (clockDisplay) clockDisplay.textContent = `${hrs}:${mins}:${secs}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Toast
  function showToast(msg) {
    const toastMsg = document.getElementById('toastMsg');
    if (toastMsg) toastMsg.textContent = msg;
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 2800);
    }
  }

  // Filename Preview & Render Pipeline
  function updateFilenamePreview() {
    if (filenamePreview && Storage) {
      filenamePreview.textContent = Storage.getExportFilename(docTitleInput.value, 'md');
    }
  }

  function renderPreview() {
    const fullMarkdown = Storage ? Storage.generateFullMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value) : editorTextarea.value;

    if (Markdown && previewContainer) {
      Markdown.renderPreview(fullMarkdown, previewContainer, true);
    }

    if (Stats) {
      const stats = Stats.calculateStats(fullMarkdown);
      if (statWords) statWords.textContent = `${stats.words} ORD`;
      if (statChars) statChars.textContent = `${stats.chars} TEGN`;
      if (statLines) statLines.textContent = `${stats.lines} LINJER`;
      if (statReadTime) statReadTime.textContent = stats.readTimeMins <= 1 ? '< 1 MIN LÆSETID' : `${stats.readTimeMins} MIN LÆSETID`;
    }

    updateFilenamePreview();

    let saveResult = null;
    if (Storage) {
      saveResult = Storage.saveDraft({
        title: docTitleInput ? docTitleInput.value : '',
        categories: docCategoriesInput ? docCategoriesInput.value : '',
        body: editorTextarea ? editorTextarea.value : ''
      });
    }

    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) {
      const hasContent = (docTitleInput && docTitleInput.value.trim()) ||
                         (docCategoriesInput && docCategoriesInput.value.trim()) ||
                         (editorTextarea && editorTextarea.value.trim());
      if (!hasContent) {
        statusIndicator.textContent = '● TOMT';
        statusIndicator.className = 'status-indicator';
      } else if (saveResult && !saveResult.ok) {
        statusIndicator.textContent = '✖ KUN I HUKOMMELSE';
        statusIndicator.className = 'status-indicator error';
      } else if (saveResult && !saveResult.local && saveResult.session) {
        statusIndicator.textContent = '▲ I SESSION';
        statusIndicator.className = 'status-indicator warning';
      } else {
        statusIndicator.textContent = '● GEMT';
        statusIndicator.className = 'status-indicator online';
      }
    }
  }

  // Tab View Switcher (Editor vs Preview)
  tabEditor.addEventListener('click', () => {
    tabEditor.classList.add('active');
    tabPreview.classList.remove('active');
    editorView.classList.remove('hidden');
    previewView.classList.add('hidden');
    scrollTerminalToCenter(false);
  });

  tabPreview.addEventListener('click', () => {
    tabPreview.classList.add('active');
    tabEditor.classList.remove('active');
    previewView.classList.remove('hidden');
    editorView.classList.add('hidden');
    renderPreview();
  });

  function updateToolbarStates() {
    if (Formatter && editorTextarea) {
      Formatter.updateToolbarStates(editorTextarea, '.term-key[data-cmd]');
    }
  }

  // Toolbar Formatting Keys
  document.querySelectorAll('.term-key[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      playTerminalTypingSound('char');
      if (Formatter) {
        Formatter.applyFormat(cmd, editorTextarea, () => {
          renderPreview();
          updateToolbarStates();
          scrollTerminalToCenter(true);
        });
      }
    });
  });

  // Typing Audio Trigger & Tab Indentation Support
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

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editorTextarea.selectionStart;
      const end = editorTextarea.selectionEnd;
      editorTextarea.value = editorTextarea.value.substring(0, start) + '  ' + editorTextarea.value.substring(end);
      editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 2;
      renderPreview();
      scrollTerminalToCenter(true);
    }
  });

  [docTitleInput, docCategoriesInput].forEach(inputEl => {
    if (inputEl) {
      inputEl.addEventListener('input', () => {
        renderPreview();
        playTerminalTypingSound('char');
      });
    }
  });

  editorTextarea.addEventListener('input', () => {
    renderPreview();
    scrollTerminalToCenter(true);
  });
  editorTextarea.addEventListener('keyup', (e) => {
    updateToolbarStates();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
      scrollTerminalToCenter(true);
    }
  });
  editorTextarea.addEventListener('click', () => {
    updateToolbarStates();
    scrollTerminalToCenter(true);
  });
  editorTextarea.addEventListener('paste', () => {
    setTimeout(() => {
      renderPreview();
      scrollTerminalToCenter(true);
    }, 20);
  });
  document.addEventListener('selectionchange', updateToolbarStates);

  // Quick Chips
  if (chipDate) {
    chipDate.addEventListener('click', () => {
      if (Formatter && Storage) {
        Formatter.appendCategoryTag(docCategoriesInput, `Dato: ${Storage.getFormattedDanishDate()}`, renderPreview);
        showToast('Dags dato tilføjet');
      }
    });
  }

  if (chipLocation) {
    chipLocation.addEventListener('click', () => {
      if (Formatter) {
        showToast('Søger efter placering...');
        Formatter.fetchLocation(
          (locStr) => {
            Formatter.appendCategoryTag(docCategoriesInput, locStr, renderPreview);
            showToast('Sted tilføjet');
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
      if (Formatter) {
        Formatter.appendCategoryTag(docCategoriesInput, 'Tags: ', renderPreview);
        showToast('Tags skabelon tilføjet');
      }
    });
  }

  // Export Menu & Actions
  if (btnExportMenu && exportDropdown) {
    btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      exportDropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      exportDropdown.classList.remove('open');
    });
  }

  if (btnExportMd) {
    btnExportMd.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) {
        const filename = Export.exportMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value);
        showToast(`Downloadet ${filename}`);
      }
    });
  }

  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) Export.triggerPdfPrint(renderPreview);
    });
  }

  if (btnCopyMd) {
    btnCopyMd.addEventListener('click', async () => {
      if (Export) {
        try {
          await Export.copyMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value);
          showToast('Markdown kopieret til udklipsholder');
        } catch (e) {
          showToast('Fejl ved kopiering');
        }
      }
    });
  }

  if (btnCopyMdDropdown) {
    btnCopyMdDropdown.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (btnCopyMd) btnCopyMd.click();
    });
  }

  // Clear Action
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Er du sikker på, at du vil rydde skærmen?')) {
        docTitleInput.value = '';
        docCategoriesInput.value = '';
        editorTextarea.value = '';
        if (Storage) Storage.clearDraft();
        renderPreview();
        showToast('Skærm ryddet');
      }
    });
  }

  // Mode Switch Navigation Links (Pass active draft to other editions)
  document.querySelectorAll('.term-mode-link, a[href="index.html"], a[href="skrivemaskine.html"]').forEach(link => {
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

  function isTouchOrIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
           ('ontouchstart' in window && window.innerWidth <= 1366);
  }

  // Fullscreen & Distraction-Free Mode
  function toggleFullscreen(e, forceExit = false) {
    if (e && e.preventDefault) e.preventDefault();
    playTerminalTypingSound('char');
    const isFullscreen = document.body.classList.contains('fullscreen-active') ||
                         document.body.classList.contains('distraction-free-mode') ||
                         !!(document.fullscreenElement || document.webkitFullscreenElement);

    if (!isFullscreen) {
      document.body.classList.add('fullscreen-active', 'distraction-free-mode');
      if (!isTouchOrIOS()) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen().catch(() => {});
        }
      }
      if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
      showToast('Fuldskærmsmodus aktiveret (ESC for at afslutte)');
    } else {
      if (!forceExit && window.isFocusTimerRunning && window.isFocusTimerRunning()) {
        if (typeof window.showFocusStrictWarning === 'function') {
          window.showFocusStrictWarning();
        }
        return;
      }

      document.body.classList.remove('fullscreen-active', 'distraction-free-mode');
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
      if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
      showToast('Forladt fuldskærm');
    }
  }

  // Drag & Drop Import
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && /\.(md|markdown|txt)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          if (Storage) {
            const parsed = Storage.parseAndLoadMdFile(file.name, content);
            docTitleInput.value = parsed.title;
            docCategoriesInput.value = parsed.categories;
            editorTextarea.value = parsed.body;
            renderPreview();
            showToast(`"${file.name}" INDLÆST`);
          }
        };
        reader.readAsText(file);
      } else {
        showToast('FEJL: KUN .MD ELLER .TXT FILER');
      }
    }
  });

  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);
  if (floatingExitFs) floatingExitFs.addEventListener('click', toggleFullscreen);

  function handleFsChange() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFs) {
      const isInputActive = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (isInputActive || isTouchOrIOS()) return;

      if (!document.body.classList.contains('distraction-free-mode')) {
        document.body.classList.remove('fullscreen-active', 'distraction-free-mode');
        if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
      }
    } else if (isFs) {
      document.body.classList.add('fullscreen-active', 'distraction-free-mode');
      if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
    }
  }

  document.addEventListener('fullscreenchange', handleFsChange);
  document.addEventListener('webkitfullscreenchange', handleFsChange);

  // Global Shortcuts
  document.addEventListener('keydown', (e) => {
    if (Formatter && Formatter.fKeyMap[e.key]) {
      e.preventDefault();
      const btn = document.querySelector(`.term-key[data-cmd="${Formatter.fKeyMap[e.key]}"]`);
      if (btn) btn.click();
      return;
    }
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      toggleFullscreen();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (btnExportMd) btnExportMd.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      if (btnPrintPdf) btnPrintPdf.click();
    }
    if (e.key === 'Escape') {
      let modalOrDropdownClosed = false;
      if (shortcutModal && !shortcutModal.classList.contains('hidden')) {
        shortcutModal.classList.add('hidden');
        modalOrDropdownClosed = true;
      }
      const focusDropdown = document.getElementById('focusTimerDropdown');
      if (focusDropdown && focusDropdown.classList.contains('active')) {
        focusDropdown.classList.remove('active');
        modalOrDropdownClosed = true;
      }
      const customModal = document.getElementById('focusCustomModal');
      if (customModal && customModal.classList.contains('active')) {
        customModal.classList.remove('active');
        modalOrDropdownClosed = true;
      }
      const breakOverlay = document.getElementById('focusBreakOverlay');
      if (breakOverlay && breakOverlay.classList.contains('active')) {
        breakOverlay.classList.remove('active');
        modalOrDropdownClosed = true;
      }
      const strictModal = document.getElementById('focusStrictModal');
      if (strictModal && strictModal.classList.contains('active')) {
        strictModal.classList.remove('active');
        modalOrDropdownClosed = true;
      }

      if (modalOrDropdownClosed) return;

      if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.body.classList.contains('fullscreen-active') ||
        document.body.classList.contains('distraction-free-mode')
      ) {
        toggleFullscreen();
      }
    }
  });

  if (btnShortcuts) {
    btnShortcuts.addEventListener('click', () => shortcutModal.classList.remove('hidden'));
  }
  if (btnCloseShortcutModal) {
    btnCloseShortcutModal.addEventListener('click', () => shortcutModal.classList.add('hidden'));
  }

  // Initial Startup Execution
  updateMidlineUI();
  if (Storage) {
    const savedDraft = Storage.loadDraft();
    if (savedDraft) {
      if (docTitleInput && savedDraft.title !== undefined) docTitleInput.value = savedDraft.title;
      if (docCategoriesInput && savedDraft.categories !== undefined) docCategoriesInput.value = savedDraft.categories;
      if (editorTextarea && savedDraft.body !== undefined) editorTextarea.value = savedDraft.body;
    }
  }

  renderPreview();
  if (midlineEnabled) {
    setTimeout(() => scrollTerminalToCenter(false), 100);
  }
});
