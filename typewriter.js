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
  const paperSheet = document.getElementById('paperSheet');
  const paperWrapper = document.querySelector('.paper-wrapper');

  // Sound & Controls
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const btnTypewriterScroll = document.getElementById('btnTypewriterScroll');
  const typewriterScrollIcon = document.getElementById('typewriterScrollIcon');
  const btnFullscreen = document.getElementById('btnFullscreen');
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
  const btnExportHtml = document.getElementById('btnExportHtml');
  const btnExportTxt = document.getElementById('btnExportTxt');
  const btnCopyMdDropdown = document.getElementById('btnCopyMdDropdown');
  const btnCopyHtmlDropdown = document.getElementById('btnCopyHtmlDropdown');
  const btnCopyMd = document.getElementById('btnCopyMd');
  const btnClear = document.getElementById('btnClear');
  const btnShortcuts = document.getElementById('btnShortcuts');
  const shortcutModal = document.getElementById('shortcutModal');
  const btnCloseShortcutModal = document.getElementById('btnCloseShortcutModal');
  const floatingExitFs = document.getElementById('floatingExitFs');
  const toast = document.getElementById('toast');

  // Stats / Odometer
  const odometerWords = document.getElementById('odometerWords');
  const statChars = document.getElementById('statChars');
  const statLines = document.getElementById('statLines');
  const statReadTime = document.getElementById('statReadTime');

  // Safe localStorage helper
  function safeGetStorage(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (e) {
      return fallback;
    }
  }

  // Typewriter Center-Scroll State
  const TYPEWRITER_SCROLL_KEY = 'md_writer_typewriter_scroll';
  let typewriterScrollEnabled = true;
  const savedScroll = safeGetStorage(TYPEWRITER_SCROLL_KEY);
  if (savedScroll !== null) {
    typewriterScrollEnabled = savedScroll === 'true';
  }

  // ----------------------------------------------------
  // REAL AUDIO SAMPLE PLAYER (.wav files) WITH FALLBACK
  // ----------------------------------------------------
  const SOUND_KEY = 'md_writer_typewriter_sound';
  let soundEnabled = true;
  let audioCtx = null;

  const savedSound = safeGetStorage(SOUND_KEY);
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

  function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function decodeBase64Sample(base64) {
    if (!base64) return null;
    try {
      initAudio();
      if (!audioCtx) return null;
      const arrayBuf = base64ToArrayBuffer(base64);
      return await audioCtx.decodeAudioData(arrayBuf);
    } catch (e) {
      return null;
    }
  }

  async function loadWavSample(url) {
    try {
      initAudio();
      if (!audioCtx) return null;
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      return await audioCtx.decodeAudioData(arrayBuf);
    } catch (e) {
      // Local file:// fetch restriction gracefully falls back
      return null;
    }
  }

  async function preloadRealWavSounds() {
    soundBuffers.keys = [];
    const embedded = window.FlowscribeSounds || {};

    // 1. Try embedded Base64 (instant, 100% offline & file:// safe without network or CORS restrictions)
    if (embedded.key1) {
      const k1 = await decodeBase64Sample(embedded.key1);
      if (k1) soundBuffers.keys.push(k1);
    }
    if (embedded.key2) {
      const k2 = await decodeBase64Sample(embedded.key2);
      if (k2) soundBuffers.keys.push(k2);
    }
    if (embedded.space) {
      soundBuffers.space = await decodeBase64Sample(embedded.space);
    }
    if (embedded.enter) {
      soundBuffers.enter = await decodeBase64Sample(embedded.enter);
    }
    if (embedded.backspace) {
      soundBuffers.backspace = await decodeBase64Sample(embedded.backspace);
    }

    // 2. Fallback to fetch() from sounds/ directory if not embedded or if decoding failed
    if (soundBuffers.keys.length === 0) {
      const k1 = await loadWavSample('sounds/key1.wav');
      if (k1) soundBuffers.keys.push(k1);
      const k2 = await loadWavSample('sounds/key2.wav');
      if (k2) soundBuffers.keys.push(k2);
    }
    if (!soundBuffers.space) soundBuffers.space = await loadWavSample('sounds/space.wav');
    if (!soundBuffers.enter) soundBuffers.enter = await loadWavSample('sounds/enter.wav');
    if (!soundBuffers.backspace) soundBuffers.backspace = await loadWavSample('sounds/backspace.wav');
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

  // ----------------------------------------------------
  // TYPEWRITER MID-SCREEN CENTERED SCROLLING SYSTEM
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
      mirrorDiv.id = 'typewriter-caret-mirror';
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
      height: marker.offsetHeight || parseInt(computed.lineHeight || 28, 10)
    };
  }

  let scrollRaf = null;

  function scrollTypewriterToCenter(smooth = true) {
    if (!typewriterScrollEnabled || !editorTextarea || !paperWrapper) return;
    if (editorView && editorView.classList.contains('hidden')) return;

    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(() => {
      const cursorPos = editorTextarea.selectionStart || 0;
      const caret = getCaretCoordinates(editorTextarea, cursorPos);

      const wrapperRect = paperWrapper.getBoundingClientRect();
      const textareaRect = editorTextarea.getBoundingClientRect();

      // Distance of the active caret line from top of paperWrapper scroll canvas
      const caretContentY = (textareaRect.top - wrapperRect.top + paperWrapper.scrollTop) + caret.top;

      // Position active line at ~45% from the top of the viewport
      const targetViewportY = paperWrapper.clientHeight * 0.45;
      const targetScrollTop = Math.max(0, Math.round(caretContentY - targetViewportY));

      const diff = Math.abs(paperWrapper.scrollTop - targetScrollTop);
      if (diff > 4) {
        if (smooth) {
          paperWrapper.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        } else {
          paperWrapper.scrollTop = targetScrollTop;
        }
      }
    });
  }

  // ==========================================================================
  // MECHANICAL TYPEGUIDE & HAMMER RECOIL SYSTEM
  // ==========================================================================
  let typeguideEl = null;
  let typingDebounceTimer = null;

  function initTypeguide() {
    if (!editorView || typeguideEl) return;
    typeguideEl = document.createElement('div');
    typeguideEl.className = 'tw-typeguide';
    typeguideEl.id = 'twTypeguide';
    typeguideEl.innerHTML = `
      <div class="tw-typeguide-strike"></div>
      <div class="tw-typeguide-notch"></div>
      <div class="tw-strike-flash"></div>
    `;
    editorView.appendChild(typeguideEl);
  }

  function updateTypeguide(isKeyStrike = false) {
    if (!editorTextarea || !editorView || editorView.classList.contains('hidden')) {
      if (typeguideEl) typeguideEl.classList.remove('active');
      return;
    }

    if (!typeguideEl) initTypeguide();

    const isFocused = document.activeElement === editorTextarea;
    const hasSelectionRange = editorTextarea.selectionStart !== editorTextarea.selectionEnd;

    if (!isFocused || hasSelectionRange) {
      typeguideEl.classList.remove('active');
      return;
    }

    const cursorPos = editorTextarea.selectionStart || 0;
    const caret = getCaretCoordinates(editorTextarea, cursorPos);

    typeguideEl.style.setProperty('--tg-x', `${caret.left}px`);
    typeguideEl.style.setProperty('--tg-y', `${caret.top}px`);
    typeguideEl.style.transform = `translate3d(${caret.left}px, ${caret.top}px, 0)`;
    typeguideEl.style.height = `${caret.height || 28}px`;
    typeguideEl.classList.add('active');

    typeguideEl.classList.add('typing');
    if (typingDebounceTimer) clearTimeout(typingDebounceTimer);
    typingDebounceTimer = setTimeout(() => {
      if (typeguideEl) typeguideEl.classList.remove('typing');
    }, 550);

    if (isKeyStrike) {
      typeguideEl.classList.remove('striking');
      void typeguideEl.offsetWidth; // Force reflow to re-trigger animation
      typeguideEl.classList.add('striking');
    }
  }

  function updateTypewriterScrollUI() {
    if (btnTypewriterScroll) {
      btnTypewriterScroll.classList.toggle('active', typewriterScrollEnabled);
      btnTypewriterScroll.setAttribute(
        'title',
        typewriterScrollEnabled
          ? 'Midterlinje aktiv (Skrivemaskine fastholder aktiv linje på midten af skærmen)'
          : 'Standard rulning (Midterlinje slået fra)'
      );
    }
  }

  if (btnTypewriterScroll) {
    btnTypewriterScroll.addEventListener('click', () => {
      typewriterScrollEnabled = !typewriterScrollEnabled;
      try {
        localStorage.setItem(TYPEWRITER_SCROLL_KEY, typewriterScrollEnabled);
      } catch (e) {}
      updateTypewriterScrollUI();
      showToast(
        typewriterScrollEnabled ? 'Midterlinje-rulning Aktiveret' : 'Standard rulning slået til',
        'target'
      );
      playKeyClickSound();
      if (typewriterScrollEnabled) {
        scrollTypewriterToCenter(true);
      }
    });
  }

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
    if (paperSheet) paperSheet.classList.remove('preview-active');
    autoResizeTextarea();
    playKeyClickSound();
    scrollTypewriterToCenter(false);
    setTimeout(() => updateTypeguide(false), 50);
  });

  tabPreview.addEventListener('click', () => {
    tabPreview.classList.add('active');
    tabPaper.classList.remove('active');
    previewView.classList.remove('hidden');
    editorView.classList.add('hidden');
    if (paperSheet) paperSheet.classList.add('preview-active');
    if (typeguideEl) typeguideEl.classList.remove('active');
    renderPreview();
    playKeyClickSound();
  });

  function autoResizeTextarea() {
    if (!editorTextarea) return;
    const prevWrapperScroll = paperWrapper ? paperWrapper.scrollTop : 0;
    const prevWindowScroll = window.scrollY || (document.documentElement ? document.documentElement.scrollTop : 0);

    editorTextarea.style.height = 'auto';
    const scrollH = editorTextarea.scrollHeight;
    editorTextarea.style.height = Math.max(480, scrollH + 40) + 'px';

    if (paperWrapper) {
      paperWrapper.scrollTop = prevWrapperScroll;
    }
    if (prevWindowScroll) {
      window.scrollTo(0, prevWindowScroll);
    }
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

    let saveResult = null;
    if (Storage) {
      saveResult = Storage.saveDraft({
        title: docTitleInput ? docTitleInput.value : '',
        categories: docCategoriesInput ? docCategoriesInput.value : '',
        body: editorTextarea ? editorTextarea.value : ''
      });
    }

    const saveIndicator = document.getElementById('saveIndicator');
    if (saveIndicator) {
      const hasContent = (docTitleInput && docTitleInput.value.trim()) ||
                         (docCategoriesInput && docCategoriesInput.value.trim()) ||
                         (editorTextarea && editorTextarea.value.trim());
      if (!hasContent) {
        saveIndicator.textContent = 'Tomt dokument';
        saveIndicator.className = 'tw-save-indicator';
      } else if (saveResult && !saveResult.ok) {
        saveIndicator.textContent = 'Kun i hukommelsen (eksportér nu)';
        saveIndicator.className = 'tw-save-indicator save-error';
      } else if (saveResult && !saveResult.local && saveResult.session) {
        saveIndicator.textContent = 'Gemt i session';
        saveIndicator.className = 'tw-save-indicator save-warning';
      } else {
        saveIndicator.textContent = 'Gemt automatisk';
        saveIndicator.className = 'tw-save-indicator';
      }
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

  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', () => {
      playKeyClickSound();
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) Export.triggerPdfPrint(renderPreview);
    });
  }

  if (btnExportHtml) {
    btnExportHtml.addEventListener('click', () => {
      playKeyClickSound();
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) {
        const filename = Export.exportHtml(docTitleInput.value, docCategoriesInput.value, editorTextarea.value, false);
        showToast(`HTML-fil gemt som: ${filename}`, 'code');
      }
    });
  }

  if (btnExportTxt) {
    btnExportTxt.addEventListener('click', () => {
      playKeyClickSound();
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) {
        const filename = Export.exportTxt(docTitleInput.value, docCategoriesInput.value, editorTextarea.value);
        showToast(`Tekstfil gemt som: ${filename}`, 'file-text');
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

  if (btnCopyHtmlDropdown) {
    btnCopyHtmlDropdown.addEventListener('click', async () => {
      playKeyClickSound();
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) {
        try {
          await Export.copyHtml(docTitleInput.value, docCategoriesInput.value, editorTextarea.value);
          showToast('Formateret rig tekst kopieret!', 'clipboard');
        } catch (e) {
          showToast('Kunne ikke kopiere formateret tekst', 'alert-circle');
        }
      }
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

  [docTitleInput, docCategoriesInput].forEach(inputEl => {
    if (inputEl) {
      inputEl.addEventListener('keydown', handleTypingSound);
      inputEl.addEventListener('focus', () => {
        if (paperWrapper && typewriterScrollEnabled) {
          paperWrapper.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  });

  if (editorTextarea) {
    editorTextarea.addEventListener('keydown', (e) => {
      handleTypingSound(e);
      if (Formatter && Formatter.handleSmartKeys) {
        if (Formatter.handleSmartKeys(editorTextarea, e, () => {
          renderPreview();
          updateToolbarStates();
          scrollTypewriterToCenter(true);
        })) {
          updateTypeguide(true);
          return;
        }
      }
      // Trigger typewriter hammer recoil animation on actual typing keys
      if ((!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) || e.key === 'Backspace' || e.key === 'Enter') {
        updateTypeguide(true);
      }
    });

    editorTextarea.addEventListener('keyup', (e) => {
      updateToolbarStates();
      updateTypeguide(false);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
        scrollTypewriterToCenter(true);
      }
    });

    editorTextarea.addEventListener('click', () => {
      updateToolbarStates();
      updateTypeguide(false);
      scrollTypewriterToCenter(true);
    });

    editorTextarea.addEventListener('focus', () => {
      updateTypeguide(false);
    });

    editorTextarea.addEventListener('blur', () => {
      if (typeguideEl) typeguideEl.classList.remove('active');
    });

    editorTextarea.addEventListener('input', () => {
      autoResizeTextarea();
      renderPreview();
      updateTypeguide(true);
      scrollTypewriterToCenter(true);
    });

    editorTextarea.addEventListener('paste', () => {
      setTimeout(() => {
        autoResizeTextarea();
        renderPreview();
        updateTypeguide(false);
        scrollTypewriterToCenter(true);
      }, 20);
    });

    if (paperWrapper) {
      editorTextarea.addEventListener('wheel', (e) => {
        paperWrapper.scrollTop += e.deltaY;
      }, { passive: true });
    }
  }

  window.addEventListener('resize', () => {
    autoResizeTextarea();
    updateTypeguide(false);
  });
  document.addEventListener('selectionchange', () => {
    updateToolbarStates();
    if (document.activeElement === editorTextarea) {
      updateTypeguide(false);
    }
  });

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

  function isTouchOrIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
           ('ontouchstart' in window);
  }

  // Fullscreen & Distraction-Free Mode
  function toggleFullscreen(forceExit = false) {
    playKeyClickSound();
    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.body.classList.contains('distraction-free-mode') ||
      document.body.classList.contains('fullscreen-active')
    );

    if (!isFullscreen) {
      if (!isTouchOrIOS()) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen().catch(() => {});
        }
      }
      document.body.classList.add('distraction-free-mode', 'fullscreen-active');
      if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
      if (btnFullscreen) {
        btnFullscreen.classList.add('active');
        btnFullscreen.setAttribute('title', 'Forlad Fuldskærm (Alt+F eller ESC)');
      }
      showToast('Fuldskærm & Distraktionsfri Skrivemodus Aktiveret', 'maximize');
    } else {
      if (!forceExit && window.isFocusTimerRunning && window.isFocusTimerRunning()) {
        if (typeof window.showFocusStrictWarning === 'function') {
          window.showFocusStrictWarning();
        }
        return;
      }

      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
      document.body.classList.remove('distraction-free-mode', 'fullscreen-active');
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

  function handleFullscreenChange() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFs) {
      const isInputActive = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (isInputActive || isTouchOrIOS()) return;

      if (!document.body.classList.contains('distraction-free-mode')) {
        document.body.classList.remove('distraction-free-mode', 'fullscreen-active');
        if (btnFullscreen) btnFullscreen.classList.remove('active');
      }
    } else if (isFs) {
      document.body.classList.add('distraction-free-mode', 'fullscreen-active');
      if (btnFullscreen) btnFullscreen.classList.add('active');
    }
    if (typeof window.updateFocusTimerPlacement === 'function') window.updateFocusTimerPlacement();
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

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
      let modalOrDropdownClosed = false;

      if (shortcutModal && !shortcutModal.classList.contains('hidden')) {
        closeShortcutModal();
        modalOrDropdownClosed = true;
      }
      if (exportDropdown && exportDropdown.classList.contains('open')) {
        exportDropdown.classList.remove('open');
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

      if (modalOrDropdownClosed) {
        return;
      }

      const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.body.classList.contains('distraction-free-mode') ||
        document.body.classList.contains('fullscreen-active')
      );

      if (isFullscreen) {
        toggleFullscreen();
      }
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
  updateTypewriterScrollUI();
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
  initTypeguide();
  preloadRealWavSounds();
  if (typewriterScrollEnabled) {
    setTimeout(() => {
      scrollTypewriterToCenter(false);
      updateTypeguide(false);
    }, 120);
  }
});
