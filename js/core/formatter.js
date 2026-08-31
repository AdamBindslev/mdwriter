/**
 * Flowscribe - Core Formatter Module
 * Handles text insertion, Markdown formatting commands, active toolbar tracking,
 * metadata tag helpers and geolocation lookup.
 */

(function () {
  window.MDCore = window.MDCore || {};

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

  /**
   * Apply a formatting command to the selected text in a textarea
   */
  function applyFormat(command, textarea, onUpdate) {
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selectedText = val.substring(start, end);
    const isAtLineStart = start === 0 || val[start - 1] === '\n';
    const preBreak = isAtLineStart ? '' : '\n';

    let replacement = '';
    let selStart = start;
    let selEnd = end;

    switch (command) {
      case 'h1':
        if (selectedText) {
          replacement = `${preBreak}# ${selectedText}`;
          selStart = start + preBreak.length + 2;
          selEnd = selStart + selectedText.length;
        } else {
          const placeholder = 'Overskrift 1';
          replacement = `${preBreak}# ${placeholder}`;
          selStart = start + preBreak.length + 2;
          selEnd = selStart + placeholder.length;
        }
        break;
      case 'h2':
        if (selectedText) {
          replacement = `${preBreak}## ${selectedText}`;
          selStart = start + preBreak.length + 3;
          selEnd = selStart + selectedText.length;
        } else {
          const placeholder = 'Overskrift 2';
          replacement = `${preBreak}## ${placeholder}`;
          selStart = start + preBreak.length + 3;
          selEnd = selStart + placeholder.length;
        }
        break;
      case 'h3':
        if (selectedText) {
          replacement = `${preBreak}### ${selectedText}`;
          selStart = start + preBreak.length + 4;
          selEnd = selStart + selectedText.length;
        } else {
          const placeholder = 'Overskrift 3';
          replacement = `${preBreak}### ${placeholder}`;
          selStart = start + preBreak.length + 4;
          selEnd = selStart + placeholder.length;
        }
        break;
      case 'bold':
        if (selectedText) {
          replacement = `**${selectedText}**`;
          selStart = start + 2;
          selEnd = start + 2 + selectedText.length;
        } else {
          const placeholder = 'fed tekst';
          replacement = `**${placeholder}**`;
          selStart = start + 2;
          selEnd = start + 2 + placeholder.length;
        }
        break;
      case 'italic':
        if (selectedText) {
          replacement = `*${selectedText}*`;
          selStart = start + 1;
          selEnd = start + 1 + selectedText.length;
        } else {
          const placeholder = 'kursiv tekst';
          replacement = `*${placeholder}*`;
          selStart = start + 1;
          selEnd = start + 1 + placeholder.length;
        }
        break;
      case 'strikethrough':
        if (selectedText) {
          replacement = `~~${selectedText}~~`;
          selStart = start + 2;
          selEnd = start + 2 + selectedText.length;
        } else {
          const placeholder = 'gennemstreget tekst';
          replacement = `~~${placeholder}~~`;
          selStart = start + 2;
          selEnd = start + 2 + placeholder.length;
        }
        break;
      case 'code':
        if (selectedText) {
          replacement = `\`${selectedText}\``;
          selStart = start + 1;
          selEnd = start + 1 + selectedText.length;
        } else {
          const placeholder = 'kode';
          replacement = `\`${placeholder}\``;
          selStart = start + 1;
          selEnd = start + 1 + placeholder.length;
        }
        break;
      case 'quote':
        if (selectedText) {
          const lines = selectedText.split('\n');
          replacement = preBreak + lines.map(line => `> ${line}`).join('\n');
          selStart = start + preBreak.length;
          selEnd = start + replacement.length;
        } else {
          const placeholder = 'Citat';
          replacement = `${preBreak}> ${placeholder}`;
          selStart = start + preBreak.length + 2;
          selEnd = selStart + placeholder.length;
        }
        break;
      case 'ul':
        if (selectedText) {
          const lines = selectedText.split('\n');
          replacement = preBreak + lines.map(line => `- ${line}`).join('\n');
          selStart = start + preBreak.length;
          selEnd = start + replacement.length;
        } else {
          const placeholder = 'Punkt';
          replacement = `${preBreak}- ${placeholder}`;
          selStart = start + preBreak.length + 2;
          selEnd = selStart + placeholder.length;
        }
        break;
      case 'ol':
        if (selectedText) {
          const lines = selectedText.split('\n');
          replacement = preBreak + lines.map((line, idx) => `${idx + 1}. ${line}`).join('\n');
          selStart = start + preBreak.length;
          selEnd = start + replacement.length;
        } else {
          const placeholder = 'Nummereret punkt';
          replacement = `${preBreak}1. ${placeholder}`;
          selStart = start + preBreak.length + 3;
          selEnd = selStart + placeholder.length;
        }
        break;
      case 'task':
        if (selectedText) {
          const lines = selectedText.split('\n');
          replacement = preBreak + lines.map(line => `- [ ] ${line}`).join('\n');
          selStart = start + preBreak.length;
          selEnd = start + replacement.length;
        } else {
          const placeholder = 'Opgave';
          replacement = `${preBreak}- [ ] ${placeholder}`;
          selStart = start + preBreak.length + 6;
          selEnd = selStart + placeholder.length;
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
      case 'image':
        if (selectedText) {
          replacement = `![${selectedText}](https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800)`;
          selStart = start + 2;
          selEnd = start + 2 + selectedText.length;
        } else {
          const placeholder = 'Billedbeskrivelse';
          replacement = `![${placeholder}](https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800)`;
          selStart = start + 2;
          selEnd = start + 2 + placeholder.length;
        }
        break;
      case 'codeblock':
        if (selectedText) {
          replacement = `${preBreak}\`\`\`\n${selectedText}\n\`\`\``;
          selStart = start + preBreak.length + 4;
          selEnd = selStart + selectedText.length;
        } else {
          const placeholder = 'Tekstblok';
          replacement = `${preBreak}\`\`\`\n${placeholder}\n\`\`\``;
          selStart = start + preBreak.length + 4;
          selEnd = selStart + placeholder.length;
        }
        break;
      case 'diagram':
        if (selectedText) {
          replacement = `${preBreak}\`\`\`mermaid\nflowchart LR\n    ${selectedText}\n\`\`\``;
          selStart = start + preBreak.length + 24;
          selEnd = selStart + selectedText.length;
        } else {
          const sample = `flowchart LR\n    A[Start] --> B[Proces] --> C[Slut]`;
          replacement = `${preBreak}\`\`\`mermaid\n${sample}\n\`\`\``;
          selStart = start + preBreak.length + 11;
          selEnd = selStart + sample.length;
        }
        break;
      case 'table':
        replacement = `${preBreak}| Kolonne 1 | Kolonne 2 | Kolonne 3 |\n| --- | --- | --- |\n| Værdi 1 | Værdi 2 | Værdi 3 |\n| Værdi 4 | Værdi 5 | Værdi 6 |`;
        selStart = start + preBreak.length + 2;
        selEnd = start + preBreak.length + 11;
        break;
      case 'hr':
        replacement = `${preBreak}---\n`;
        selStart = start + replacement.length;
        selEnd = selStart;
        break;
      default:
        return;
    }

    textarea.setRangeText(replacement, start, end, 'end');
    textarea.setSelectionRange(selStart, selEnd);
    textarea.focus();

    if (typeof onUpdate === 'function') {
      onUpdate();
    }
  }

  /**
   * Tracks active formatting under cursor and updates UI buttons
   */
  function updateToolbarStates(textarea, buttonsSelector = '.tb-btn[data-cmd], .term-key[data-cmd]') {
    if (!textarea) return;

    const activeCmds = new Set();
    const text = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', start);
    if (lineEnd === -1) lineEnd = text.length;
    const lineText = text.substring(lineStart, lineEnd);

    if (/^#\s+/.test(lineText)) activeCmds.add('h1');
    else if (/^##\s+/.test(lineText)) activeCmds.add('h2');
    else if (/^###\s+/.test(lineText)) activeCmds.add('h3');
    else if (/^>\s+/.test(lineText)) activeCmds.add('quote');
    else if (/^-\s+\[[ x]\]\s+/.test(lineText)) activeCmds.add('task');
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

    document.querySelectorAll(buttonsSelector).forEach(btn => {
      const cmd = btn.getAttribute('data-cmd');
      if (activeCmds.has(cmd)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Append a metadata category/tag with separator
   */
  function appendCategoryTag(input, tagLabel, onUpdate) {
    if (!input) return;
    if (!input.value) {
      input.value = tagLabel;
    } else {
      const current = input.value.trim();
      input.value = current ? `${current} | ${tagLabel}` : tagLabel;
    }
    input.focus();
    if (typeof onUpdate === 'function') {
      onUpdate();
    }
  }

  /**
   * Fetch geolocation string via Nominatim OpenStreetMap API
   */
  function fetchLocation(onSuccess, onError) {
    if (!navigator.geolocation) {
      if (onError) onError('Geolocation ikke understøttet');
      return;
    }
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
            if (onSuccess) onSuccess(locationStr);
          } else {
            if (onError) onError('Placering kunne ikke hentes');
          }
        } catch (e) {
          if (onError) onError(e.message);
        }
      },
      (err) => {
        if (onError) onError(err.message);
      },
      { timeout: 7000 }
    );
  }

  window.MDCore.Formatter = {
    fKeyMap,
    applyFormat,
    updateToolbarStates,
    appendCategoryTag,
    fetchLocation
  };
})();
