(function () {
    'use strict';

    function buildTableOfContents(source, { depth = 3, startPage = 1 } = {}) {
        if (![1, 2, 3].includes(depth)) throw new Error('Choose a heading depth from 1 to 3.');
        if (!Number.isInteger(startPage) || startPage < 1 || startPage > 1000000) {
            throw new Error('First page number must be a whole number from 1 to 1,000,000.');
        }

        // Keep line boundaries when removing non-content blocks.
        const text = String(source).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
            .replace(/<!--[\s\S]*?(?:-->|$)|<(style|script)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,
                (block) => block.replace(/[^\n]/g, ''));
        const entries = [];
        let page = startPage;
        let fence = null;

        for (const line of text.split('\n')) {
            if (fence) {
                const closing = line.match(/^ {0,3}(`+|~+)\s*$/);
                if (closing && closing[1][0] === fence.char && closing[1].length >= fence.length) fence = null;
                continue;
            }
            const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
            if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) {
                fence = { char: opening[1][0], length: opening[1].length };
                continue;
            }
            if (/^ {0,3}\\page[\t ]*$/.test(line)) {
                page += 1;
                continue;
            }
            const heading = line.match(/^ {0,3}(#{1,3})[\t ]+(.+?)\s*$/);
            if (!heading || heading[1].length > depth) continue;
            const title = heading[2].replace(/[\t ]+#+\s*$/, '').trim();
            if (title) entries.push({ level: heading[1].length, title, page });
        }

        const output = entries.map(({ level, title, page: entryPage }) => {
            // Escape link-label delimiters without changing emphasis in titles.
            const label = title.replace(/\\([\[\]\\])/g, '$1').replace(/[\\\[\]]/g, '\\$&');
            const prefix = level === 1 ? '- ### ' : level === 2 ? '- #### ' : '  - ';
            return `${prefix}[{{ ${label}}}{{ ${entryPage}}}](#p${entryPage})`;
        }).join('\n');

        return { output, entries, pageCount: page - startPage + 1 };
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = { buildTableOfContents };
    if (typeof document === 'undefined') return;

    const sourceInput = document.getElementById('sourceInput');
    const outputText = document.getElementById('outputText');
    const depthInput = document.getElementById('depthInput');
    const startPageInput = document.getElementById('startPageInput');
    const copyBtn = document.getElementById('copyBtn');
    const statusText = document.getElementById('statusText');
    const entryCount = document.getElementById('entryCount');

    function setStatus(message, isError = false) {
        statusText.textContent = message;
        statusText.classList.toggle('is-error', isError);
    }

    function resetOutput() {
        outputText.value = '';
        copyBtn.disabled = true;
        entryCount.textContent = '0';
    }

    function markChanged() {
        resetOutput();
        setStatus('Source or settings changed. Click Create TOC to process.');
    }

    document.getElementById('tocForm').addEventListener('submit', (event) => {
        event.preventDefault();
        resetOutput();
        if (!sourceInput.value.trim()) {
            setStatus('Paste your source Markdown before creating a TOC.', true);
            sourceInput.focus();
            return;
        }
        try {
            const result = buildTableOfContents(sourceInput.value, {
                depth: Number(depthInput.value), startPage: Number(startPageInput.value)
            });
            if (!result.entries.length) {
                setStatus('No headings found at the selected depth. Use #, ##, or ### followed by a space and a title.', true);
                return;
            }
            outputText.value = result.output;
            entryCount.textContent = String(result.entries.length);
            copyBtn.disabled = false;
            setStatus(`Created ${result.entries.length} TOC entries across ${result.pageCount} source page${result.pageCount === 1 ? '' : 's'}. Ready to copy.`);
        } catch (error) {
            setStatus(error.message, true);
        }
    });

    startPageInput.addEventListener('invalid', () => {
        resetOutput();
        setStatus('First page number must be a whole number from 1 to 1,000,000.', true);
    });
    sourceInput.addEventListener('input', markChanged);
    depthInput.addEventListener('change', markChanged);
    startPageInput.addEventListener('input', markChanged);

    document.getElementById('exampleBtn').addEventListener('click', () => {
        sourceInput.value = '# Sylwaen\n\n### Behavior\nText about behavior.\n\n\\page\n\nMore text.\n\n\\page\n\n## Description\nText about appearance.';
        startPageInput.value = '292';
        depthInput.value = '3';
        markChanged();
        setStatus('Example loaded, starting on page 292. Click Create TOC.');
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        sourceInput.value = '';
        startPageInput.value = '1';
        depthInput.value = '3';
        resetOutput();
        setStatus('Cleared. Paste your source to begin.');
        sourceInput.focus();
    });

    copyBtn.addEventListener('click', async () => {
        const output = outputText.value;
        if (!output) return;
        try {
            if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(output);
            setStatus(outputText.value === output ? 'TOC copied to clipboard.' : 'Previous TOC copied. Create a new TOC for the changed source.');
        } catch {
            // Local file pages may not have Clipboard API permission.
            if (outputText.value !== output) return;
            outputText.focus();
            outputText.select();
            let copied = false;
            try { copied = document.execCommand('copy'); } catch { /* Keep selection for manual copy. */ }
            setStatus(copied ? 'TOC copied to clipboard.' : 'TOC selected. Press Ctrl+C (or Command+C) to copy it.', !copied);
        }
    });
})();
