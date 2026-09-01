// Flowscribe — Modern Splitview Edition (Clean Modularized UI)
// Orchestrates MDCore (Storage, Stats, Markdown, Formatter, Export) with rich visual UI

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
  const saveIndicator = document.getElementById('saveIndicator');

  // View Mode Controls
  const workspace = document.getElementById('workspace');
  const btnViewSplit = document.getElementById('btnViewSplit');
  const btnViewEditor = document.getElementById('btnViewEditor');
  const btnViewPreview = document.getElementById('btnViewPreview');

  // Theme Toggle
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');

  // Midline / Centered Typewriter Scroll Toggle
  const btnMidlineToggle = document.getElementById('btnMidlineToggle');
  const midlineIcon = document.getElementById('midlineIcon');
  const MIDLINE_KEY = 'md_writer_midline_scroll';
  let midlineEnabled = true;

  function safeGetStorage(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (e) {
      return fallback;
    }
  }

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
        midlineEnabled ? 'Midterlinje-rulning Aktiveret' : 'Standard rulning slået til',
        'target'
      );
      if (midlineEnabled) {
        scrollEditorToCenter(true);
      }
    });
  }

  // ----------------------------------------------------
  // MID-SCREEN CENTERED SCROLLING SYSTEM (EDITOR)
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
      mirrorDiv.id = 'app-caret-mirror';
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

  // Synchronized Scrolling Helpers
  let isScrollingEditor = false;
  let isScrollingPreview = false;
  let syncScrollTimeout = null;

  function syncEditorToPreview(smooth = false) {
    if (!editorTextarea || !previewContainer || isScrollingPreview) return;
    const editorMax = editorTextarea.scrollHeight - editorTextarea.clientHeight;
    const previewMax = previewContainer.scrollHeight - previewContainer.clientHeight;
    if (editorMax <= 0 || previewMax <= 0) return;

    isScrollingEditor = true;
    const percentage = Math.max(0, Math.min(1, editorTextarea.scrollTop / editorMax));
    const target = Math.round(percentage * previewMax);

    if (smooth) {
      previewContainer.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      previewContainer.scrollTop = target;
    }

    if (syncScrollTimeout) clearTimeout(syncScrollTimeout);
    syncScrollTimeout = setTimeout(() => { isScrollingEditor = false; }, 60);
  }

  function syncPreviewToEditor() {
    if (!editorTextarea || !previewContainer || isScrollingEditor) return;
    const editorMax = editorTextarea.scrollHeight - editorTextarea.clientHeight;
    const previewMax = previewContainer.scrollHeight - previewContainer.clientHeight;
    if (editorMax <= 0 || previewMax <= 0) return;

    isScrollingPreview = true;
    const percentage = Math.max(0, Math.min(1, previewContainer.scrollTop / previewMax));
    editorTextarea.scrollTop = Math.round(percentage * editorMax);

    if (syncScrollTimeout) clearTimeout(syncScrollTimeout);
    syncScrollTimeout = setTimeout(() => { isScrollingPreview = false; }, 60);
  }

  let scrollRaf = null;

  function scrollEditorToCenter(smooth = true) {
    if (!midlineEnabled || !editorTextarea) return;

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

      // Always keep preview synchronized with editor position during midline scrolling
      syncEditorToPreview(smooth);
    });
  }

  // Quick Chips
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
  const btnShortcuts = document.getElementById('btnShortcuts');
  const shortcutModal = document.getElementById('shortcutModal');
  const btnCloseShortcutModal = document.getElementById('btnCloseShortcutModal');
  const floatingExitFs = document.getElementById('floatingExitFs');
  const toast = document.getElementById('toast');

  // Stats Counters
  const statWords = document.getElementById('statWords');
  const statChars = document.getElementById('statChars');
  const statLines = document.getElementById('statLines');
  const statReadTime = document.getElementById('statReadTime');

  // Toast Notification Trigger
  function showToast(message, icon = 'check-circle') {
    if (!toast) return;
    toast.innerHTML = `<i data-feather="${icon}"></i> <span>${message}</span>`;
    if (window.feather) feather.replace();
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Update Filename Badge Preview
  function updateFilenameBadge() {
    if (filenamePreview && Storage) {
      filenamePreview.textContent = Storage.getExportFilename(docTitleInput.value, 'md');
    }
  }

  // Auto-Save Indicator Tracker
  function updateSaveIndicator(saveResult) {
    if (!saveIndicator) return;
    const hasContent = (docTitleInput && docTitleInput.value.trim()) ||
                       (docCategoriesInput && docCategoriesInput.value.trim()) ||
                       (editorTextarea && editorTextarea.value.trim());

    if (!hasContent) {
      saveIndicator.innerHTML = '<i data-feather="file-text"></i> Tomt dokument';
      saveIndicator.classList.remove('save-error', 'save-warning');
    } else if (saveResult && !saveResult.ok) {
      saveIndicator.innerHTML = '<i data-feather="alert-triangle"></i> Kun i hukommelsen (eksportér nu)';
      saveIndicator.classList.add('save-error');
      saveIndicator.classList.remove('save-warning');
    } else if (saveResult && !saveResult.local && saveResult.session) {
      saveIndicator.innerHTML = '<i data-feather="alert-circle"></i> Gemt i session';
      saveIndicator.classList.add('save-warning');
      saveIndicator.classList.remove('save-error');
    } else {
      saveIndicator.innerHTML = '<i data-feather="check"></i> Gemt automatisk';
      saveIndicator.classList.remove('save-error', 'save-warning');
    }
    if (window.feather) feather.replace();
  }

  // Render Pipeline: Markdown -> HTML Preview & Stats
  function renderPreview() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const fullMarkdown = Storage ? Storage.generateFullMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value) : editorTextarea.value;

    if (Markdown && previewContainer) {
      Markdown.renderPreview(fullMarkdown, previewContainer, isDark);
    }

    if (Stats) {
      Stats.updateStatsUI({
        text: fullMarkdown,
        wordsEl: statWords,
        charsEl: statChars,
        linesEl: statLines,
        readTimeEl: statReadTime
      });
    }

    updateFilenameBadge();

    let saveResult = null;
    if (Storage) {
      saveResult = Storage.saveDraft({
        title: docTitleInput ? docTitleInput.value : '',
        categories: docCategoriesInput ? docCategoriesInput.value : '',
        body: editorTextarea ? editorTextarea.value : ''
      });
    }

    updateSaveIndicator(saveResult);
  }

  // Toolbar Formatting Actions
  document.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      if (Formatter) {
        Formatter.applyFormat(cmd, editorTextarea, renderPreview);
      }
    });
  });

  function updateToolbarActiveStates() {
    if (Formatter && editorTextarea) {
      Formatter.updateToolbarStates(editorTextarea, '.tb-btn[data-cmd]');
    }
  }

  document.addEventListener('selectionchange', updateToolbarActiveStates);
  if (editorTextarea) {
    editorTextarea.addEventListener('keyup', (e) => {
      updateToolbarActiveStates();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
        scrollEditorToCenter(true);
      }
    });
    editorTextarea.addEventListener('click', () => {
      updateToolbarActiveStates();
      scrollEditorToCenter(true);
    });
    editorTextarea.addEventListener('input', () => {
      renderPreview();
      scrollEditorToCenter(true);
    });
    editorTextarea.addEventListener('paste', () => {
      setTimeout(() => {
        renderPreview();
        scrollEditorToCenter(true);
      }, 20);
    });
  }

  if (docTitleInput) docTitleInput.addEventListener('input', renderPreview);
  if (docCategoriesInput) docCategoriesInput.addEventListener('input', renderPreview);

  // Quick Metadata Chips
  if (chipDate) {
    chipDate.addEventListener('click', () => {
      if (Formatter && Storage) {
        Formatter.appendCategoryTag(docCategoriesInput, `Dato: ${Storage.getFormattedDanishDate()}`, renderPreview);
        showToast('Dags dato tilføjet', 'calendar');
      }
    });
  }

  if (chipLocation) {
    chipLocation.addEventListener('click', () => {
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
      if (Formatter) {
        Formatter.appendCategoryTag(docCategoriesInput, 'Tags: ', renderPreview);
      }
    });
  }

  // View Mode Switcher
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

  if (btnViewSplit) btnViewSplit.addEventListener('click', () => setViewMode('split'));
  if (btnViewEditor) btnViewEditor.addEventListener('click', () => setViewMode('editor'));
  if (btnViewPreview) btnViewPreview.addEventListener('click', () => setViewMode('preview'));

  // Theme Toggle (Dark / Light)
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      themeIcon.setAttribute('data-feather', newTheme === 'light' ? 'moon' : 'sun');
      if (window.feather) feather.replace();
      renderPreview();
      showToast(`Skiftede til ${newTheme === 'light' ? 'Lyst' : 'Mørkt'} tema`);
    });
  }

  // Export Menu & Actions
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

  if (btnExportMd) {
    btnExportMd.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) {
        const filename = Export.exportMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value);
        showToast(`Fil gemt som: ${filename}`, 'download');
      }
    });
  }

  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.classList.remove('open');
      if (Export) {
        Export.triggerPdfPrint(renderPreview);
      }
    });
  }

  if (btnCopyMd) {
    btnCopyMd.addEventListener('click', async () => {
      if (Export) {
        try {
          await Export.copyMarkdown(docTitleInput.value, docCategoriesInput.value, editorTextarea.value);
          showToast('Markdown kopieret til udklipsholder!', 'copy');
        } catch (e) {
          console.error('Kopiering mislykkedes', e);
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
      if (confirm('Er du sikker på, at du vil rydde alle felter?')) {
        docTitleInput.value = '';
        docCategoriesInput.value = '';
        editorTextarea.value = '';
        if (Storage) Storage.clearDraft();
        renderPreview();
        showToast('Tekst ryddet', 'trash-2');
      }
    });
  }

  // Mode Switch Navigation Links (Pass active draft to typewriter / terminal)
  document.querySelectorAll('.mode-toggle-group a').forEach(link => {
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

  // Synchronized Scrolling between Editor and Preview
  if (editorTextarea && previewContainer) {
    editorTextarea.addEventListener('scroll', () => {
      syncEditorToPreview(false);
    }, { passive: true });

    previewContainer.addEventListener('scroll', () => {
      syncPreviewToEditor();
    }, { passive: true });
  }

  // Drag & Drop File Upload Support
  const dragOverlay = document.getElementById('dragOverlay');

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (workspace) workspace.classList.add('drag-over');
  });

  if (dragOverlay) {
    dragOverlay.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (workspace) workspace.classList.remove('drag-over');
    });
  }

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (workspace) workspace.classList.remove('drag-over');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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
            showToast(`Filen "${file.name}" blev indlæst!`, 'upload');
          }
        };
        reader.readAsText(file);
      } else {
        showToast('Venligst upload en .md eller .txt fil', 'alert-circle');
      }
    }
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

  // Global Keyboard Shortcuts
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

    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (e.shiftKey && key === 'p') {
        e.preventDefault();
        if (workspace.classList.contains('mode-split')) setViewMode('editor');
        else if (workspace.classList.contains('mode-editor')) setViewMode('preview');
        else setViewMode('split');
      } else if (key === 's') {
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
      } else if (key === 'b') {
        e.preventDefault();
        if (Formatter) Formatter.applyFormat('bold', editorTextarea, renderPreview);
      } else if (key === 'i') {
        e.preventDefault();
        if (Formatter) Formatter.applyFormat('italic', editorTextarea, renderPreview);
      } else if (key === 'k') {
        e.preventDefault();
        if (Formatter) Formatter.applyFormat('link', editorTextarea, renderPreview);
      }
    }

    if (e.altKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  // Fullscreen & Distraction-Free Mode
  const btnFullscreen = document.getElementById('btnFullscreen');

  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);
  if (floatingExitFs) floatingExitFs.addEventListener('click', toggleFullscreen);

  function isTouchOrIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
           ('ontouchstart' in window && window.innerWidth <= 1366);
  }

  function toggleFullscreen(forceExit = false) {
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
      showToast('Forlod Fuldskærmstilstand', 'minimize');
    }

    if (window.feather) {
      setTimeout(() => feather.replace(), 50);
    }
  }

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

  // Initial Load Pipeline
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
    setTimeout(() => scrollEditorToCenter(false), 100);
  }
});
