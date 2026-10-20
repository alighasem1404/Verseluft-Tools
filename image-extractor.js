(() => {
    'use strict';

    const fileInput = document.getElementById('fileInput');
    const folderBtn = document.getElementById('folderBtn');
    const folderName = document.getElementById('folderName');
    const dropzone = document.getElementById('dropzone');
    const extractBtn = document.getElementById('extractBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusText = document.getElementById('statusText');
    const imageCount = document.getElementById('imageCount');
    const resultBadge = document.getElementById('resultBadge');
    const results = document.getElementById('results');

    let selectedFiles = [];
    let entries = [];
    let outputDirectory = null;
    let previewUrls = [];

    function setStatus(message, isError = /^Error:/i.test(message)) {
        statusText.textContent = message;
        statusText.classList.toggle('is-error', isError);
    }

    function updateExtractAvailability() {
        extractBtn.disabled = selectedFiles.length === 0 || !outputDirectory;
    }

    function requireDestinationAgain() {
        outputDirectory = null;
        folderName.textContent = 'Required — choose a destination folder';
    }

    function clearPreviews() {
        for (const url of previewUrls) URL.revokeObjectURL(url);
        previewUrls = [];
    }

    function setFiles(fileList) {
        selectedFiles = Array.from(fileList || []).filter((file) => /\.(txt|md|markdown|json)$/i.test(file.name));
        fileInput.value = '';
        updateExtractAvailability();
        setStatus(selectedFiles.length && !outputDirectory
            ? 'Error: choose a destination folder before extracting.'
            : (selectedFiles.length ? `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} ready.` : 'Choose .txt, .md, or .json files to begin.'));
        if (selectedFiles.length) {
            results.replaceChildren();
            results.append(createEmpty(`Selected: ${selectedFiles.map((file) => file.name).join(', ')}`));
        }
    }

    function createEmpty(message) {
        const div = document.createElement('div');
        div.className = 'extractor-empty';
        div.textContent = message;
        return div;
    }

    function collectReferences(text) {
        const found = [];
        const add = (value) => {
            const clean = String(value || '').trim().replace(/^<|>$/g, '').replace(/[),.;]+$/g, '');
            if (clean) found.push(clean);
        };
        const patterns = [
            /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\s*\)/g,
            /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi,
            /(?:https?:\/\/|data:image\/)[^\s"'<>]+/gi
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                // Markdown and HTML patterns use capture groups; the raw URL
                // pattern does not, so fall back to the full match.
                add(match.slice(1).find(Boolean) || match[0]);
            }
        }
        return [...new Set(found)];
    }

    function safeName(value, fallback) {
        let name = String(value || '').split(/[?#]/, 1)[0].split('/').pop() || fallback;
        try { name = decodeURIComponent(name); } catch (_) {}
        name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
        return name || fallback;
    }

    function extensionFromType(type) {
        const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/bmp': '.bmp', 'image/avif': '.avif', 'image/x-icon': '.ico' };
        return map[type.toLowerCase().split(';')[0].trim()] || '.img';
    }

    function dataImageToBlob(uri) {
        const match = uri.match(/^data:(image\/[\w.+-]+)?(;base64)?,([\s\S]*)$/i);
        if (!match) throw new Error('Invalid embedded image data');
        const mime = match[1] || 'application/octet-stream';
        const raw = match[3];
        const bytes = match[2] ? Uint8Array.from(atob(raw), (char) => char.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(raw));
        return new Blob([bytes], { type: mime });
    }

    async function loadImage(reference) {
        if (/^data:image\//i.test(reference)) {
            const blob = dataImageToBlob(reference);
            return { blob, name: `embedded-image${extensionFromType(blob.type)}` };
        }
        let url;
        try { url = new URL(reference); } catch (_) { throw new Error('Not an absolute image URL'); }
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL type');
        const response = await fetch(url.href, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.type.toLowerCase().startsWith('image/')) throw new Error('Link did not return an image');
        let name = safeName(url.pathname, `image${extensionFromType(blob.type)}`);
        if (!/\.[a-z0-9]{2,5}$/i.test(name)) name += extensionFromType(blob.type);
        return { blob, name };
    }

    function uniqueName(name, used) {
        const dot = name.lastIndexOf('.');
        const stem = dot > 0 ? name.slice(0, dot) : name;
        const ext = dot > 0 ? name.slice(dot) : '';
        let candidate = name;
        let index = 2;
        while (used.has(candidate.toLowerCase())) candidate = `${stem}-${index++}${ext}`;
        used.add(candidate.toLowerCase());
        return candidate;
    }

    function renderEntries() {
        clearPreviews();
        results.replaceChildren();
        imageCount.textContent = String(entries.length);
        resultBadge.textContent = `${entries.filter((entry) => entry.blob).length} ready · ${entries.filter((entry) => !entry.blob).length} skipped`;
        if (!entries.length) {
            results.append(createEmpty('No image references were found in the selected files.'));
            return;
        }
        for (const entry of entries) {
            const row = document.createElement('div');
            row.className = 'extractor-item';
            const preview = document.createElement('img');
            preview.className = 'extractor-thumb';
            preview.alt = '';
            if (entry.blob) {
                const url = URL.createObjectURL(entry.blob);
                previewUrls.push(url);
                preview.src = url;
            }
            const info = document.createElement('div');
            info.className = 'extractor-item-info';
            const name = document.createElement('div');
            name.className = 'extractor-item-name';
            name.textContent = entry.name;
            const source = document.createElement('div');
            source.className = 'extractor-item-source';
            source.textContent = `${entry.sourceFile} · ${entry.reference}`;
            source.title = entry.reference;
            const state = document.createElement('div');
            state.className = 'extractor-item-status';
            state.textContent = entry.savedName ? `Saved as ${entry.savedName}` : (entry.saveError || (entry.blob ? 'Ready to save' : entry.error));
            info.append(name, source);
            row.append(preview, info, state);
            results.append(row);
        }
    }

    async function extract() {
        if (!selectedFiles.length) return;
        if (!outputDirectory) {
            setStatus('Error: choose a destination folder before extracting.');
            return;
        }
        extractBtn.disabled = true;
        entries = [];
        clearPreviews();
        results.replaceChildren();
        const references = new Map();
        for (const file of selectedFiles) {
            try {
                const text = await file.text();
                for (const reference of collectReferences(text)) {
                    const key = reference.startsWith('data:') ? reference.slice(0, 120) : reference;
                    if (!references.has(key)) references.set(key, { reference, sourceFile: file.name });
                }
            } catch (error) {
                console.error('Could not read file', file.name, error);
            }
        }
        const items = [...references.values()];
        if (!items.length) {
            renderEntries();
            requireDestinationAgain();
            setStatus('No image references found.');
            updateExtractAvailability();
            return;
        }
        const usedNames = new Set();
        let done = 0;
        for (const item of items) {
            setStatus(`Checking images… ${done} of ${items.length}`);
            try {
                const loaded = await loadImage(item.reference);
                entries.push({ ...item, blob: loaded.blob, name: uniqueName(loaded.name, usedNames) });
            } catch (error) {
                entries.push({ ...item, blob: null, name: safeName(item.reference, 'image'), error: error.message || 'Could not load image' });
            }
            done += 1;
        }
        renderEntries();
        const ready = entries.filter((entry) => entry.blob).length;
        setStatus(`${ready} image${ready === 1 ? '' : 's'} ready to save${entries.length > ready ? `; ${entries.length - ready} skipped` : ''}.`);
        if (ready) await saveImages();
        else requireDestinationAgain();
        updateExtractAvailability();
    }

    async function saveImages() {
        const ready = entries.filter((entry) => entry.blob);
        if (!ready.length) return;
        let saved = 0;
        let targetFolder = outputDirectory.name;
        for (const entry of ready) {
            try {
                let name = entry.name;
                const dot = name.lastIndexOf('.');
                const stem = dot > 0 ? name.slice(0, dot) : name;
                const ext = dot > 0 ? name.slice(dot) : '';
                let suffix = 2;
                while (true) {
                    try {
                        await outputDirectory.getFileHandle(name);
                        name = `${stem}-${suffix++}${ext}`;
                    } catch (error) {
                        if (error.name !== 'NotFoundError') throw error;
                        break;
                    }
                }
                const handle = await outputDirectory.getFileHandle(name, { create: true });
                const writable = await handle.createWritable();
                await writable.write(entry.blob);
                await writable.close();
                entry.savedName = name;
                saved += 1;
            } catch (error) {
                console.error('Could not save', entry.name, error);
                entry.saveError = `Save failed: ${error.message || 'write error'}`;
            }
        }
        renderEntries();
        requireDestinationAgain();
        setStatus(`${saved} of ${ready.length} image${ready.length === 1 ? '' : 's'} saved to ${targetFolder}${saved < ready.length ? '. Some files could not be saved.' : '.'}`, saved < ready.length);
    }

    fileInput.addEventListener('change', () => setFiles(fileInput.files));
    extractBtn.addEventListener('click', extract);
    folderBtn.addEventListener('click', async () => {
        if (!window.showDirectoryPicker) {
            setStatus('Error: this browser does not support folder access. Open this tool in a browser with the File System Access API.');
            return;
        }
        try {
            outputDirectory = await window.showDirectoryPicker({ mode: 'readwrite' });
            folderName.textContent = outputDirectory.name;
            updateExtractAvailability();
            setStatus(selectedFiles.length ? `Destination set to ${outputDirectory.name}. Ready to extract.` : `Destination set to ${outputDirectory.name}. Now choose your source files.`);
        } catch (error) {
            if (error.name === 'AbortError') {
                outputDirectory = null;
                folderName.textContent = 'Required — choose a destination folder';
                updateExtractAvailability();
                setStatus('Error: no destination folder was selected.');
            } else setStatus(`Error choosing destination folder: ${error.message || 'access denied'}`);
        }
    });
    clearBtn.addEventListener('click', () => {
        selectedFiles = [];
        entries = [];
        requireDestinationAgain();
        clearPreviews();
        results.replaceChildren();
        imageCount.textContent = '0';
        resultBadge.textContent = 'Nothing extracted yet';
        updateExtractAvailability();
        setStatus('Choose one or more files to begin.');
    });
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
    });
    for (const eventName of ['dragenter', 'dragover']) {
        dropzone.addEventListener(eventName, (event) => { event.preventDefault(); dropzone.classList.add('dragover'); });
    }
    for (const eventName of ['dragleave', 'drop']) {
        dropzone.addEventListener(eventName, (event) => { event.preventDefault(); dropzone.classList.remove('dragover'); });
    }
    dropzone.addEventListener('drop', (event) => setFiles(event.dataTransfer.files));
})();
