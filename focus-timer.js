/**
 * FLOWSCRIBE - POMODORO FOCUS TIMER & DISTRACTION-FREE SYSTEM
 * Naturally integrated into toolbars across Standard, Typewriter, and Terminal modes.
 * Supports 25/5, 50/10 & Custom Minutes, Auto-Fullscreen on Start,
 * Auto-Hide UI on typing, Web Audio Bell, and Strict Focus Warnings.
 */

(function () {
  'use strict';

  // --- STATE ---
  let workDurationSeconds = 25 * 60; // Default 25 min
  let breakDurationSeconds = 5 * 60; // Default 5 min
  let remainingSeconds = workDurationSeconds;
  let timerInterval = null;
  let timerState = 'stopped'; // 'stopped', 'running', 'paused', 'break'
  let typingTimeout = null;

  // --- WEB AUDIO CHIME (No external files required) ---
  function playFocusChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(ctx.currentTime + 2.5);
      osc2.stop(ctx.currentTime + 2.5);
    } catch (e) {
      console.warn('Audio chime unsupported or blocked', e);
    }
  }

  // --- FORMAT HELPER ---
  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // --- FULLSCREEN HELPERS ---
  function enterFullscreen() {
    const docEl = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen().catch(() => {});
      }
    }
    document.body.classList.add('distraction-free-mode', 'fullscreen-active');
  }

  function exitFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen().catch(() => {});
      }
    }
    document.body.classList.remove('distraction-free-mode', 'fullscreen-active');
  }

  // --- DOM INJECTION & MOUNTING ---
  function initFocusTimer() {
    // Inject Modals into Body if not present
    if (!document.getElementById('focusBreakOverlay')) {
      const modalHTML = `
        <!-- Break Overlay Modal -->
        <div id="focusBreakOverlay" class="focus-modal-overlay">
          <div class="focus-break-card">
            <div class="focus-break-icon">☕</div>
            <h2 class="focus-break-title">Tid til en fortjent pause!</h2>
            <p class="focus-break-subtitle">Du har fuldført din fokus-session. Træk vejret dybt, stræk benene eller hent et glas vand.</p>
            <div class="focus-break-timer-box" id="focusBreakTimerDigits">05:00</div>
            <div class="focus-break-actions">
              <button id="btnStartBreakNow" class="focus-break-btn primary">
                <i data-feather="coffee"></i> Start Pause Nedtælling
              </button>
              <button id="btnSkipBreak" class="focus-break-btn secondary">
                Fortsæt med at skrive
              </button>
            </div>
          </div>
        </div>

        <!-- Custom Minutes Modal -->
        <div id="focusCustomModal" class="focus-modal-overlay">
          <div class="focus-custom-card">
            <h3 style="font-size: 18px; font-weight: 700; color: #f8fafc;">Brugerdefineret Fokus-tid</h3>
            <div class="focus-custom-input-group">
              <label for="customMinutesInput">Indtast antal minutter (f.eks. 20):</label>
              <input type="number" id="customMinutesInput" class="focus-custom-input" min="1" max="180" value="20">
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px;">
              <button id="btnCancelCustom" class="focus-break-btn secondary" style="flex: initial; padding: 8px 16px;">Annuller</button>
              <button id="btnSaveCustom" class="focus-break-btn primary" style="flex: initial; padding: 8px 20px;">Gem & Start</button>
            </div>
          </div>
        </div>

        <!-- Strict Focus Warning Modal -->
        <div id="focusStrictModal" class="focus-modal-overlay">
          <div class="focus-strict-card">
            <div class="focus-strict-icon">⚠️</div>
            <h3 class="focus-strict-title">Fokussession i gang!</h3>
            <p class="focus-strict-desc" id="focusStrictDescText">
              Du forlod distraktionsfri fuldskærm før tid. For maksimalt distraktionsfrit fokus anbefales det at fortsætte i fuldskærm.
            </p>
            <div style="display: flex; gap: 10px; width: 100%; margin-top: 6px;">
              <button id="btnResumeStrictFullscreen" class="focus-break-btn primary">
                Genoptag Fuldskærm
              </button>
              <button id="btnAbortStrictTimer" class="focus-break-btn secondary">
                Afbryd Timer
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Mount Timer Widget into Toolbar Mount Point
    const mount = document.querySelector('.focus-timer-mount');
    if (mount && !document.getElementById('focusTimerWidget')) {
      mount.innerHTML = `
        <div class="focus-timer-widget" id="focusTimerWidget">
          <div class="focus-timer-display" id="focusTimerDisplay" title="Klik for at vælge interval">
            <span class="focus-timer-icon"><i data-feather="clock"></i></span>
            <span class="focus-timer-digits" id="focusTimerDigits">25:00</span>
            <span class="focus-timer-state-tag" id="focusTimerStateTag">Fokus</span>
          </div>

          <button id="btnFocusPlayPause" class="focus-timer-btn primary" title="Start / Pause (Går automatisk i fuldskærm)">
            <i data-feather="play" id="focusPlayPauseIcon"></i>
          </button>
          
          <button id="btnFocusReset" class="focus-timer-btn" title="Nulstil Timer">
            <i data-feather="rotate-ccw"></i>
          </button>

          <!-- Dropdown Menu -->
          <div class="focus-timer-dropdown" id="focusTimerDropdown">
            <div class="focus-timer-dropdown-header">Vælg Fokus-interval</div>
            <button class="focus-timer-dropdown-item active" data-work="25" data-break="5">
              <span>25 min arbejde / 5 min pause</span>
            </button>
            <button class="focus-timer-dropdown-item" data-work="50" data-break="10">
              <span>50 min arbejde / 10 min pause</span>
            </button>
            <button class="focus-timer-dropdown-item" id="btnDropdownCustom">
              <span>Brugerdefineret tid...</span>
            </button>
            <div class="focus-timer-dropdown-divider"></div>
            <button class="focus-timer-dropdown-item" id="btnDropdownReset">
              <span style="color: #ef4444;">Nulstil Timer</span>
            </button>
          </div>
        </div>
      `;
    }

    if (window.feather) {
      window.feather.replace();
    }

    bindEvents();
    bindAutoUIHide();
    bindFullscreenMonitoring();
  }

  // --- TIMER LOGIC ---
  function startTimer() {
    // Automatically enter fullscreen on starting a focus session
    enterFullscreen();

    if (timerState === 'running') return;

    timerState = (timerState === 'break') ? 'break' : 'running';
    updateWidgetUI();

    timerInterval = setInterval(() => {
      remainingSeconds--;

      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        onTimerComplete();
      } else {
        updateWidgetUI();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (timerState === 'running') timerState = 'paused';
    updateWidgetUI();
  }

  function resetTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerState = 'stopped';
    remainingSeconds = workDurationSeconds;
    updateWidgetUI();
  }

  function setPreset(workMins, breakMins) {
    workDurationSeconds = workMins * 60;
    breakDurationSeconds = breakMins * 60;
    resetTimer();
  }

  function onTimerComplete() {
    playFocusChime();

    if (timerState === 'running') {
      // Work session ended -> Show Break Overlay
      timerState = 'break';
      remainingSeconds = breakDurationSeconds;
      showBreakOverlay();
    } else if (timerState === 'break') {
      // Break ended -> Return to Stopped / Ready state
      timerState = 'stopped';
      remainingSeconds = workDurationSeconds;
      hideBreakOverlay();
      if (typeof window.showToast === 'function') {
        window.showToast('Pausen er slut! Klar til ny fokus-session.', 'award');
      }
    }
    updateWidgetUI();
  }

  // --- BREAK OVERLAY ---
  function showBreakOverlay() {
    const overlay = document.getElementById('focusBreakOverlay');
    const breakDigits = document.getElementById('focusBreakTimerDigits');
    if (breakDigits) breakDigits.textContent = formatTime(breakDurationSeconds);
    if (overlay) overlay.classList.add('active');
  }

  function hideBreakOverlay() {
    const overlay = document.getElementById('focusBreakOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // --- UI UPDATES ---
  function updateWidgetUI() {
    const digitsElements = document.querySelectorAll('#focusTimerDigits');
    const playIconElements = document.querySelectorAll('#focusPlayPauseIcon');
    const stateTagElements = document.querySelectorAll('#focusTimerStateTag');
    const widgets = document.querySelectorAll('#focusTimerWidget');

    digitsElements.forEach((el) => {
      el.textContent = formatTime(remainingSeconds);
    });

    const breakDigits = document.getElementById('focusBreakTimerDigits');
    if (breakDigits && timerState === 'break') {
      breakDigits.textContent = formatTime(remainingSeconds);
    }

    widgets.forEach((w) => {
      w.classList.remove('is-running', 'is-break');
      if (timerState === 'running') w.classList.add('is-running');
      if (timerState === 'break') w.classList.add('is-break');
    });

    playIconElements.forEach((el) => {
      if (timerState === 'running' || (timerState === 'break' && timerInterval)) {
        el.setAttribute('data-feather', 'pause');
      } else {
        el.setAttribute('data-feather', 'play');
      }
    });

    stateTagElements.forEach((el) => {
      if (timerState === 'running') el.textContent = 'Fokus';
      else if (timerState === 'paused') el.textContent = 'Pause';
      else if (timerState === 'break') el.textContent = 'Pause-Tid';
      else el.textContent = 'Klar';
    });

    if (window.feather) window.feather.replace();
  }

  // --- EVENT BINDING ---
  function bindEvents() {
    document.addEventListener('click', (e) => {
      // Toggle Dropdown
      const displayBtn = e.target.closest('#focusTimerDisplay');
      const dropdown = document.getElementById('focusTimerDropdown');
      if (displayBtn && dropdown) {
        dropdown.classList.toggle('active');
        return;
      }
      if (dropdown && !e.target.closest('#focusTimerWidget')) {
        dropdown.classList.remove('active');
      }

      // Play/Pause Button -> Auto-enters Fullscreen
      const playBtn = e.target.closest('#btnFocusPlayPause');
      if (playBtn) {
        if (timerState === 'running' || (timerState === 'break' && timerInterval)) {
          pauseTimer();
        } else {
          startTimer();
        }
        return;
      }

      // Reset
      const resetBtn = e.target.closest('#btnFocusReset') || e.target.closest('#btnDropdownReset');
      if (resetBtn) {
        resetTimer();
        if (dropdown) dropdown.classList.remove('active');
        return;
      }

      // Preset Item Clicks
      const item = e.target.closest('.focus-timer-dropdown-item[data-work]');
      if (item) {
        const wMins = parseInt(item.getAttribute('data-work'), 10);
        const bMins = parseInt(item.getAttribute('data-break'), 10);
        setPreset(wMins, bMins);

        document.querySelectorAll('.focus-timer-dropdown-item').forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
        if (dropdown) dropdown.classList.remove('active');
        startTimer(); // Auto start & enter fullscreen when choosing preset
        return;
      }

      // Custom Time Click
      if (e.target.closest('#btnDropdownCustom')) {
        if (dropdown) dropdown.classList.remove('active');
        const customModal = document.getElementById('focusCustomModal');
        if (customModal) customModal.classList.add('active');
        return;
      }

      // Custom Time Save/Cancel
      if (e.target.closest('#btnSaveCustom')) {
        const input = document.getElementById('customMinutesInput');
        const customMins = parseInt(input.value, 10);
        if (customMins && customMins > 0) {
          const breakMins = customMins >= 45 ? 10 : 5;
          setPreset(customMins, breakMins);
          startTimer();
        }
        const customModal = document.getElementById('focusCustomModal');
        if (customModal) customModal.classList.remove('active');
        return;
      }

      if (e.target.closest('#btnCancelCustom')) {
        const customModal = document.getElementById('focusCustomModal');
        if (customModal) customModal.classList.remove('active');
        return;
      }

      // Break Overlay Actions
      if (e.target.closest('#btnStartBreakNow')) {
        startTimer();
        hideBreakOverlay();
        return;
      }

      if (e.target.closest('#btnSkipBreak')) {
        hideBreakOverlay();
        resetTimer();
        return;
      }

      // Strict Focus Warning Actions
      if (e.target.closest('#btnResumeStrictFullscreen')) {
        const strictModal = document.getElementById('focusStrictModal');
        if (strictModal) strictModal.classList.remove('active');
        enterFullscreen();
        return;
      }

      if (e.target.closest('#btnAbortStrictTimer')) {
        const strictModal = document.getElementById('focusStrictModal');
        if (strictModal) strictModal.classList.remove('active');
        resetTimer();
        return;
      }
    });
  }

  // --- AUTO-HIDE UI ON TYPING ---
  function bindAutoUIHide() {
    function onUserTyping() {
      document.body.classList.add('is-typing');
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        document.body.classList.remove('is-typing');
      }, 1800);
    }

    function onMouseMove() {
      document.body.classList.remove('is-typing');
      if (typingTimeout) clearTimeout(typingTimeout);
    }

    document.addEventListener('keydown', (e) => {
      if (!['Control', 'Alt', 'Meta', 'Shift'].includes(e.key)) {
        onUserTyping();
      }
    });

    document.addEventListener('mousemove', onMouseMove);
  }

  // --- FULLSCREEN STRICT FOCUS MONITORING ---
  function bindFullscreenMonitoring() {
    function handleFullscreenChange() {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      
      if (!isFs) {
        document.body.classList.remove('distraction-free-mode', 'fullscreen-active');

        if (timerState === 'running') {
          const strictModal = document.getElementById('focusStrictModal');
          const descText = document.getElementById('focusStrictDescText');
          const minsLeft = Math.ceil(remainingSeconds / 60);

          if (descText) {
            descText.textContent = `Du forlod distraktionsfri fuldskærm før tid (ca. ${minsLeft} min tilbage af din fokus-session). Vil du genoptage fuldskærm eller afbryde timeren?`;
          }

          if (strictModal) strictModal.classList.add('active');
        }
      } else {
        document.body.classList.add('distraction-free-mode', 'fullscreen-active');
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  }

  // DOM Content Loaded Initializer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFocusTimer);
  } else {
    initFocusTimer();
  }
})();
