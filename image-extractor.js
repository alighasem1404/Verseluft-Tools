(() => {
    'use strict';
    const MAX_FETCH_RETRIES = 3;
    const IMAGE_EXT = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)$/i;
    const $ = (id) => document.getElementById(id);
    const promptText = $('aiPrompt'), copyPromptBtn = $('copyPromptBtn');
    const originalInput = $('originalFile'), manifestInput = $('manifestFile'), verifyBtn = $('verifyBtn');
    const compareStatus = $('compareStatus'), countSummary = $('countSummary'), reviewSection = $('reviewSection');
    const folderBtn = $('folderBtn'), folderName = $('folderName'), previewBtn = $('previewBtn');
    const retryBtn = $('retryBtn'), approveBtn = $('approveBtn'), reviewStatus = $('reviewStatus');
    const resultBadge = $('resultBadge'), results = $('results'), clearBtn = $('clearBtn');
    const diagnosticLog = $('diagnosticLog'), copyLogBtn = $('copyLogBtn'), downloadLogBtn = $('downloadLogBtn');

    let originalFile = null, aiFile = null, validatedPlan = null, entries = [];
    let outputDirectory = null, previewUrls = [], previewLoaded = false;
    let comparing = false, fetchingPreview = false, retryInProgress = false, saveInProgress = false, approvalGranted = false;
    const logLines = [];

    function logEvent(message) {
        logLines.push(`[${new Date().toISOString()}] ${message}`);
        if (logLines.length > 2000) logLines.shift();
        diagnosticLog.value = logLines.join('\n');
        diagnosticLog.scrollTop = diagnosticLog.scrollHeight;
    }

    function safeLogReference(reference) {
        if (/^data:image\//i.test(reference)) {
            const comma = reference.indexOf(',');
            return `${reference.slice(0, comma > 0 ? comma : 80)}… [embedded data omitted]`;
        }
        try {
            const url = new URL(reference);
            url.username = '';
            url.password = '';
            for (const key of [...url.searchParams.keys()]) {
                if (/token|key|signature|secret|auth|password|credential|access/i.test(key)) url.searchParams.set(key, '[redacted]');
            }
            return url.href;
        } catch (_) { return String(reference).slice(0, 500); }
    }

    function setStatus(element, message, isError = /^Error:/i.test(message)) {
        element.textContent = message;
        element.classList.toggle('is-error', isError);
    }

    function clearPreviews() {
        previewUrls.forEach((url) => URL.revokeObjectURL(url));
        previewUrls = [];
    }

    function updateButtons() {
        verifyBtn.disabled = comparing || !originalFile || !aiFile;
        previewBtn.disabled = !validatedPlan || !outputDirectory || fetchingPreview || previewLoaded;
        const failed = entries.filter((entry) => !entry.blob && entry.error).length;
        retryBtn.hidden = !failed || approvalGranted;
        retryBtn.disabled = retryInProgress || fetchingPreview || !failed || approvalGranted;
        const remaining = entries.filter((entry) => entry.blob && !entry.savedName).length;
        approveBtn.disabled = !previewLoaded || saveInProgress || !remaining || !outputDirectory;
        approveBtn.textContent = approvalGranted && remaining ? `Retry saving ${remaining} remaining`
            : approvalGranted ? 'Save complete' : `Approve & save ${remaining} image${remaining === 1 ? '' : 's'}`;
    }

    function invalidateComparison(reason) {
        validatedPlan = null;
        entries = [];
        outputDirectory = null;
        previewLoaded = false;
        approvalGranted = false;
        fetchingPreview = false;
        retryInProgress = false;
        clearPreviews();
        results.replaceChildren();
        reviewSection.hidden = true;
        countSummary.hidden = true;
        countSummary.textContent = '';
        folderName.textContent = 'Required before preview';
        resultBadge.textContent = 'Waiting for preview';
        setStatus(compareStatus, 'Choose both files to compare them.');
        setStatus(reviewStatus, 'Choose a destination folder to begin previewing.');
        updateButtons();
        if (reason) logEvent(reason);
    }

    function cleanFilename(value, fallback = 'image') {
        let name = String(value || '').trim().split(/[\\/]/).pop() || fallback;
        name = name.replace(/[<>:"|?*\x00-\x1F]/g, '_').replace(/[. ]+$/g, '').trim();
        return name || fallback;
    }

    function extensionFromType(type) {
        const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/bmp': '.bmp', 'image/avif': '.avif', 'image/x-icon': '.ico', 'image/tiff': '.tif' };
        return map[String(type || '').toLowerCase().split(';')[0].trim()] || '.img';
    }

    function filenameForBlob(filename, blob) {
        const name = cleanFilename(filename, 'image');
        const actual = extensionFromType(blob.type);
        const match = name.match(/\.([a-z0-9]{2,5})$/i);
        if (!match) return `${name}${actual}`;
        const given = `.${match[1].toLowerCase()}`;
        const same = given === actual || (given === '.jpeg' && actual === '.jpg') || (given === '.jpg' && actual === '.jpeg') || (given === '.tiff' && actual === '.tif');
        return IMAGE_EXT.test(name) && same ? name : `${name.slice(0, -given.length)}${actual}`;
    }

    function uniqueName(name, used) {
        const dot = name.lastIndexOf('.'), stem = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
        let candidate = name, n = 2;
        while (used.has(candidate.toLowerCase())) candidate = `${stem}-${n++}${ext}`;
        used.add(candidate.toLowerCase());
        return candidate;
    }

    function collectReferences(text) {
        const candidates = [], ignored = new Set();
        const patterns = [
            { re: /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\s*\)/g, image: true },
            { re: /\[[^\]]*\)\{[^}]*\]\((https?:\/\/[^\\\s)]+)\\?\)\{[^}]*\)/gi, image: true },
            { re: /\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g, image: false },
            { re: /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi, image: true },
            { re: /(?:https?:\/\/|data:image\/)[^\s"'<>]+/gi, image: false }
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.re.exec(text)) !== null) {
                let ref = String(match.slice(1).find(Boolean) || match[0]).trim().replace(/^<|>$/g, '');
                const style = ref.search(/\\?\)\{[^}]*\]/);
                if (style >= 0) { logEvent(`Removed trailing image style syntax: ${safeLogReference(ref)}`); ref = ref.slice(0, style); }
                ref = ref.replace(/[),.;\\]+$/g, '');
                const normalized = normalizeImageReference(ref);
                if (normalized !== ref) logEvent(`Normalized GitHub image URL: ${safeLogReference(ref)} -> ${safeLogReference(normalized)}`);
                if (!pattern.image && !isLikelyImageReference(normalized)) {
                    if (normalized && !ignored.has(normalized)) { ignored.add(normalized); logEvent(`Ignored non-image link: ${safeLogReference(normalized)}`); }
                    continue;
                }
                if (normalized) candidates.push({ reference: normalized, start: match.index, end: match.index + match[0].length });
            }
        }
        // Nested Markdown/raw URL matches overlap; collapse those duplicates, but keep repeated image occurrences.
        candidates.sort((a, b) => a.start - b.start || b.end - a.end);
        const accepted = [];
        for (const item of candidates) if (!accepted.some((other) => item.start < other.end && item.end > other.start)) accepted.push(item);
        accepted.sort((a, b) => a.start - b.start);
        return accepted.map((item) => item.reference);
    }

    function isLikelyImageReference(reference) {
        if (/^data:image\//i.test(reference)) return true;
        let url;
        try { url = new URL(reference); } catch (_) { return false; }
        if (IMAGE_EXT.test(url.pathname)) return true;
        const formats = /^(?:avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp|image\/(?:avif|bmp|gif|ico|jpe?g|png|svg\+xml|tiff?|webp))$/i;
        for (const [key, value] of url.searchParams) if (/^(?:fm|format|mime|type|content-type|response-content-type)$/i.test(key) && formats.test(value.trim())) return true;
        return false;
    }

    function normalizeImageReference(reference) {
        if (/^data:image\//i.test(reference)) return reference;
        let url;
        try { url = new URL(reference); } catch (_) { return reference; }
        if (url.hostname.toLowerCase().replace(/^www\./, '') !== 'github.com') return reference;
        const parts = url.pathname.split('/').filter(Boolean);
        const marker = parts.findIndex((part, index) => index >= 2 && (part === 'blob' || part === 'raw'));
        if (parts.length < 5 || marker !== 2) return reference;
        let tail = parts.slice(marker + 1);
        if (tail[0] === 'refs' && ['heads', 'tags'].includes(tail[1])) tail = tail.slice(2);
        url.hostname = 'raw.githubusercontent.com';
        url.pathname = `/${parts[0]}/${parts[1]}/${tail.join('/')}`;
        url.searchParams.delete('raw');
        return url.href;
    }

    function dataImageToBlob(uri) {
        const match = uri.match(/^data:(image\/[\w.+-]+)?(;base64)?,([\s\S]*)$/i);
        if (!match) throw new Error('Invalid embedded image data');
        const mime = match[1] || 'application/octet-stream', raw = match[3];
        const bytes = match[2] ? Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(raw));
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
        logEvent(`HTTP ${response.status} (${response.type}) from ${safeLogReference(response.url || url.href)}; content-type=${response.headers.get('content-type') || 'not provided'}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.type.toLowerCase().startsWith('image/')) throw new Error('Link did not return an image');
        let name = decodeSafe(url.pathname.split('/').pop() || 'image');
        if (!IMAGE_EXT.test(name)) name += extensionFromType(blob.type);
        return { blob, name };
    }

    function decodeSafe(value) { try { return decodeURIComponent(value); } catch (_) { return value; } }

    async function loadImageWithRetries(reference, onRetry) {
        let last;
        for (let retry = 0; retry <= MAX_FETCH_RETRIES; retry += 1) {
            logEvent(`Fetch attempt ${retry + 1}/${MAX_FETCH_RETRIES + 1}: ${safeLogReference(reference)}`);
            try {
                const loaded = await loadImage(reference);
                logEvent(`Fetch succeeded: ${loaded.name}; type=${loaded.blob.type}; size=${loaded.blob.size} bytes`);
                return loaded;
            } catch (error) {
                last = error;
                logEvent(`Fetch failed on attempt ${retry + 1}: ${error.name || 'Error'}: ${error.message || String(error)}`);
                if (retry === MAX_FETCH_RETRIES) break;
                if (onRetry) onRetry(retry + 1);
                await new Promise((resolve) => setTimeout(resolve, 250 * (retry + 1)));
            }
        }
        throw new Error(`Failed after ${MAX_FETCH_RETRIES + 1} attempts: ${last?.message || 'Could not load image'}`);
    }

    function parseManifest(text) {
        const clean = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
        const value = JSON.parse(clean);
        if (!value || !Array.isArray(value.images)) throw new Error('The AI JSON must contain an "images" array.');
        return value.images;
    }

    async function verifyFiles() {
        if (!originalFile || !aiFile || comparing) return;
        invalidateComparison();
        comparing = true;
        updateButtons();
        logEvent(`Comparison started: source=${originalFile.name}; AI manifest=${aiFile.name}.`);
        setStatus(compareStatus, 'Reading both files and counting image occurrences…');
        try {
            const [sourceText, manifestText] = await Promise.all([originalFile.text(), aiFile.text()]);
            const originalRefs = collectReferences(sourceText);
            const manifestImages = parseManifest(manifestText);
            const sourceCount = originalRefs.length, aiCount = manifestImages.length;
            logEvent(`Count comparison: source=${sourceCount}; AI manifest=${aiCount}.`);
            countSummary.hidden = false;
            countSummary.classList.remove('is-error');
            countSummary.textContent = `Original: ${sourceCount} image${sourceCount === 1 ? '' : 's'} · AI file: ${aiCount} image${aiCount === 1 ? '' : 's'}`;
            if (sourceCount !== aiCount) {
                countSummary.classList.add('is-error');
                logEvent('Comparison rejected: image counts differ.');
                setStatus(compareStatus, `Error: image counts do not match (${sourceCount} in the original, ${aiCount} in the AI file). Reprocess the original with the prompt above.`, true);
                return;
            }
            for (let index = 0; index < manifestImages.length; index += 1) {
                const item = manifestImages[index];
                if (!item || typeof item.filename !== 'string' || !item.filename.trim()) throw new Error(`AI entry ${index + 1} is missing a filename. Reprocess the file with the prompt above.`);
                if (item.index !== undefined && Number(item.index) !== index + 1) throw new Error(`AI indexes must be consecutive; expected ${index + 1}, got ${item.index}. Reprocess the AI file.`);
                if (typeof item.reference !== 'string' || !item.reference.trim()) throw new Error(`AI entry ${index + 1} is missing its reference. Reprocess with the prompt above.`);
                const aiRef = normalizeImageReference(item.reference.trim());
                if (aiRef !== originalRefs[index]) logEvent(`Reference differs at index ${index + 1}; will use the original document URL. AI=${safeLogReference(aiRef)}; source=${safeLogReference(originalRefs[index])}`);
            }
            validatedPlan = originalRefs.map((reference, index) => ({
                index: index + 1,
                reference,
                sourceFile: originalFile.name,
                filename: cleanFilename(manifestImages[index].filename, `image-${String(index + 1).padStart(3, '0')}`)
            }));
            reviewSection.hidden = false;
            setStatus(compareStatus, `Accepted: both files contain ${sourceCount} image occurrence${sourceCount === 1 ? '' : 's'}. You can proceed to preview.`, false);
            setStatus(reviewStatus, 'Choose a destination folder to load previews.');
            logEvent(`Comparison accepted: ${sourceCount} image names aligned by document order.`);
        } catch (error) {
            logEvent(`Comparison error: ${error.name || 'Error'}: ${error.message || String(error)}`);
            setStatus(compareStatus, `Error: ${error.message || 'Could not compare these files.'}`, true);
            reviewSection.hidden = true;
        } finally {
            comparing = false;
            updateButtons();
        }
    }

    function renderEntries() {
        clearPreviews();
        results.replaceChildren();
        const ready = entries.filter((entry) => entry.blob).length;
        const skipped = entries.filter((entry) => !entry.blob && entry.error).length;
        resultBadge.textContent = `${ready} ready · ${skipped} skipped`;
        if (!entries.length) {
            const empty = document.createElement('div');
            empty.className = 'extractor-empty';
            empty.textContent = 'No images to preview.';
            results.append(empty);
            updateButtons();
            return;
        }
        for (const entry of entries) {
            const row = document.createElement('div');
            row.className = 'extractor-item';
            if (entry.blob) {
                const img = document.createElement('img');
                img.className = 'extractor-thumb';
                img.alt = `Preview for ${entry.filename}`;
                const url = URL.createObjectURL(entry.blob);
                previewUrls.push(url);
                img.src = url;
                row.append(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'extractor-thumb extractor-thumb-empty';
                placeholder.textContent = 'Skipped';
                row.append(placeholder);
            }
            const info = document.createElement('div');
            info.className = 'extractor-item-info';
            const title = document.createElement('div');
            title.className = 'extractor-item-name';
            title.textContent = `Image ${entry.index}`;
            const source = document.createElement('div');
            source.className = 'extractor-item-source';
            source.textContent = `${entry.sourceFile} · ${safeLogReference(entry.reference)}`;
            source.title = entry.reference;
            info.append(title, source);
            if (entry.blob) {
                const label = document.createElement('label');
                label.className = 'extractor-name-label';
                label.textContent = 'Filename';
                const input = document.createElement('input');
                input.className = 'extractor-name-input';
                input.type = 'text';
                input.value = entry.filename;
                input.disabled = approvalGranted;
                input.setAttribute('aria-label', `Filename for image ${entry.index}`);
                input.addEventListener('input', () => { entry.filename = input.value; updateButtons(); });
                label.append(input);
                info.append(label);
            }
            const state = document.createElement('div');
            state.className = 'extractor-item-status';
            state.textContent = entry.savedName ? `Saved as ${entry.savedName}` : (entry.saveError || (entry.blob ? 'Ready for approval' : entry.error));
            row.append(info, state);
            results.append(row);
        }
        updateButtons();
    }

    async function loadPreviews() {
        if (!validatedPlan || !outputDirectory || fetchingPreview || previewLoaded) return;
        fetchingPreview = true;
        entries = validatedPlan.map((item) => ({ ...item }));
        resultBadge.textContent = 'Loading previews';
        results.replaceChildren();
        logEvent(`Preview fetch started for ${entries.length} images. Destination=${outputDirectory.name}.`);
        updateButtons();
        for (let index = 0; index < entries.length; index += 1) {
            const entry = entries[index];
            setStatus(reviewStatus, `Fetching image ${index + 1} of ${entries.length}…`);
            logEvent(`Image ${entry.index}, source ${entry.sourceFile}: ${safeLogReference(entry.reference)}`);
            try {
                const loaded = await loadImageWithRetries(entry.reference, (retry) => setStatus(reviewStatus, `Image ${index + 1} failed. Retrying (${retry} of ${MAX_FETCH_RETRIES})…`));
                entry.blob = loaded.blob;
                entry.filename = filenameForBlob(entry.filename, loaded.blob);
                entry.fetchedName = loaded.name;
            } catch (error) {
                entry.error = error.message || 'Could not fetch image';
                logEvent(`Image ${entry.index} skipped after retries: ${entry.error}`);
            }
        }
        const used = new Set();
        for (const entry of entries) if (entry.blob) entry.filename = uniqueName(cleanFilename(entry.filename, `image-${entry.index}`), used);
        previewLoaded = true;
        fetchingPreview = false;
        renderEntries();
        const ready = entries.filter((entry) => entry.blob).length, skipped = entries.length - ready;
        setStatus(reviewStatus, `${ready} image${ready === 1 ? '' : 's'} ready to review${skipped ? `; ${skipped} skipped after retries` : ''}. Edit filenames, then approve to save.`);
        logEvent(`Preview fetch complete: ${ready} loaded; ${skipped} skipped.`);
        updateButtons();
    }

    async function retryFailedFetches() {
        const failed = entries.filter((entry) => !entry.blob && entry.error);
        if (!failed.length || retryInProgress || approvalGranted || !outputDirectory) return;
        retryInProgress = true;
        updateButtons();
        logEvent(`Manual retry: ${failed.length} failed images, destination=${outputDirectory.name}.`);
        const used = new Set(entries.filter((entry) => entry.blob).map((entry) => entry.filename.toLowerCase()));
        let recovered = 0;
        for (let index = 0; index < failed.length; index += 1) {
            const entry = failed[index];
            setStatus(reviewStatus, `Retrying image ${index + 1} of ${failed.length}…`);
            try {
                const loaded = await loadImageWithRetries(entry.reference, (retry) => setStatus(reviewStatus, `Image ${index + 1} failed. Retrying (${retry} of ${MAX_FETCH_RETRIES})…`));
                entry.blob = loaded.blob;
                entry.filename = uniqueName(filenameForBlob(entry.filename, loaded.blob), used);
                entry.fetchedName = loaded.name;
                delete entry.error;
                recovered += 1;
                logEvent(`Manual retry recovered image ${entry.index} as ${entry.filename}.`);
            } catch (error) {
                entry.error = error.message || 'Could not fetch image after retry';
                logEvent(`Manual retry failed for image ${entry.index}: ${entry.error}`);
            }
        }
        retryInProgress = false;
        renderEntries();
        const remaining = entries.filter((entry) => !entry.blob && entry.error).length;
        setStatus(reviewStatus, `${recovered} recovered${remaining ? `; ${remaining} still skipped` : ''}. Review filenames, then approve to save.`, recovered === 0);
        logEvent(`Manual retry complete: ${recovered} recovered, ${remaining} still skipped.`);
        updateButtons();
    }

    async function approveAndSave() {
        if (!previewLoaded || !outputDirectory || saveInProgress) return;
        const ready = entries.filter((entry) => entry.blob && !entry.savedName);
        if (!ready.length) return;
        approvalGranted = true;
        saveInProgress = true;
        updateButtons();
        const target = outputDirectory.name;
        logEvent(`User approved ${ready.length} image(s) for saving to ${target}.`);
        setStatus(reviewStatus, `Saving ${ready.length} approved image${ready.length === 1 ? '' : 's'} to ${target}…`);
        const used = new Set(entries.filter((entry) => entry.savedName).map((entry) => entry.savedName.toLowerCase()));
        let saved = 0;
        for (const entry of ready) {
            try {
                let name = uniqueName(filenameForBlob(entry.filename, entry.blob), used);
                const dot = name.lastIndexOf('.'), stem = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
                let suffix = 2;
                while (true) {
                    try {
                        await outputDirectory.getFileHandle(name);
                        name = `${stem}-${suffix++}${ext}`;
                    } catch (error) {
                        if (error.name !== 'NotFoundError') throw error;
                        used.add(name.toLowerCase());
                        break;
                    }
                }
                const handle = await outputDirectory.getFileHandle(name, { create: true });
                const writable = await handle.createWritable();
                await writable.write(entry.blob);
                await writable.close();
                entry.filename = name;
                entry.savedName = name;
                entry.saveError = '';
                saved += 1;
                logEvent(`Saved image ${entry.index}: ${name} (${entry.blob.size} bytes).`);
            } catch (error) {
                entry.saveError = `Save failed: ${error.message || 'write error'}`;
                logEvent(`Save failed for image ${entry.index} (${entry.filename}): ${error.name || 'Error'}: ${error.message || String(error)}`);
            }
        }
        saveInProgress = false;
        renderEntries();
        const remaining = entries.filter((entry) => entry.blob && !entry.savedName).length;
        if (remaining) {
            setStatus(reviewStatus, `${saved} saved; ${remaining} could not be saved. Use the retry-save button to try again.`, true);
            logEvent(`Save incomplete: ${saved} saved, ${remaining} unsaved.`);
        } else {
            const skipped = entries.filter((entry) => !entry.blob && entry.error).length;
            setStatus(reviewStatus, `Approved and saved ${entries.filter((entry) => entry.savedName).length} image(s) to ${target}${skipped ? `; ${skipped} could not be fetched` : ''}.`);
            logEvent(`Save complete: all approved images saved to ${target}.`);
        }
        updateButtons();
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
        return new Promise((resolve, reject) => {
            const helper = document.createElement('textarea');
            helper.value = text;
            helper.style.position = 'fixed';
            helper.style.opacity = '0';
            document.body.append(helper);
            helper.select();
            const copied = document.execCommand('copy');
            helper.remove();
            if (copied) resolve(); else reject(new Error('Clipboard copy was not allowed'));
        });
    }

    originalInput.addEventListener('change', () => {
        originalFile = originalInput.files[0] || null;
        invalidateComparison(`Original file selected: ${originalFile ? `${originalFile.name} (${originalFile.size} bytes)` : 'none'}.`);
        setStatus(compareStatus, originalFile && aiFile ? 'Ready to compare both files.' : 'Choose both files to compare them.');
        updateButtons();
    });
    manifestInput.addEventListener('change', () => {
        aiFile = manifestInput.files[0] || null;
        invalidateComparison(`AI file selected: ${aiFile ? `${aiFile.name} (${aiFile.size} bytes)` : 'none'}.`);
        setStatus(compareStatus, originalFile && aiFile ? 'Ready to compare both files.' : 'Choose both files to compare them.');
        updateButtons();
    });
    verifyBtn.addEventListener('click', verifyFiles);
    folderBtn.addEventListener('click', async () => {
        if (!window.showDirectoryPicker) {
            logEvent('Destination selection unavailable: this browser lacks the File System Access API.');
            setStatus(reviewStatus, 'Error: this browser does not support selecting a writable folder.', true);
            return;
        }
        try {
            outputDirectory = await window.showDirectoryPicker({ mode: 'readwrite' });
            folderName.textContent = outputDirectory.name;
            logEvent(`Destination selected: ${outputDirectory.name}.`);
            setStatus(reviewStatus, 'Destination selected. Load image previews to review the filenames.');
        } catch (error) {
            if (error.name === 'AbortError') {
                outputDirectory = null;
                folderName.textContent = 'Required before preview';
                logEvent('Destination selection cancelled.');
                setStatus(reviewStatus, 'Error: choose a destination folder before previewing.', true);
            } else {
                logEvent(`Destination selection failed: ${error.name || 'Error'}: ${error.message || String(error)}`);
                setStatus(reviewStatus, `Error choosing destination: ${error.message || 'access denied'}`, true);
            }
        }
        updateButtons();
    });
    previewBtn.addEventListener('click', loadPreviews);
    retryBtn.addEventListener('click', retryFailedFetches);
    approveBtn.addEventListener('click', approveAndSave);
    copyPromptBtn.addEventListener('click', async () => {
        try {
            await copyText(promptText.value.trim());
            logEvent('AI prompt copied to clipboard.');
            setStatus(compareStatus, 'Prompt copied. Attach your original file when you send it to AI.');
        } catch (error) {
            logEvent(`Could not copy AI prompt: ${error.message || String(error)}`);
            setStatus(compareStatus, 'Error: could not copy the prompt. Select and copy it manually.', true);
        }
    });
    copyLogBtn.addEventListener('click', async () => {
        logEvent('User requested a copy of the diagnostic log.');
        try {
            await copyText(diagnosticLog.value);
            setStatus(compareStatus, 'Diagnostic log copied to the clipboard.');
        } catch (error) {
            logEvent(`Could not copy log: ${error.message || String(error)}`);
            setStatus(compareStatus, 'Error: could not copy the log. Use Download log instead.', true);
        }
    });
    downloadLogBtn.addEventListener('click', () => {
        logEvent('User downloaded the diagnostic log.');
        const blob = new Blob([diagnosticLog.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'image-extractor-diagnostic-log.txt';
        link.style.display = 'none';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus(compareStatus, 'Diagnostic log downloaded.');
    });
    clearBtn.addEventListener('click', () => {
        originalFile = null;
        aiFile = null;
        originalInput.value = '';
        manifestInput.value = '';
        validatedPlan = null;
        entries = [];
        outputDirectory = null;
        previewLoaded = false;
        approvalGranted = false;
        fetchingPreview = false;
        retryInProgress = false;
        saveInProgress = false;
        clearPreviews();
        results.replaceChildren();
        reviewSection.hidden = true;
        countSummary.hidden = true;
        folderName.textContent = 'Required before preview';
        resultBadge.textContent = 'Waiting for preview';
        setStatus(compareStatus, 'Choose both files to compare them.');
        setStatus(reviewStatus, 'Choose a destination folder to begin previewing.');
        logEvent('Workflow reset by user.');
        updateButtons();
    });
    window.addEventListener('error', (event) => logEvent(`Uncaught JavaScript error: ${event.message || 'unknown error'} at ${event.filename || 'unknown file'}:${event.lineno || 0}:${event.colno || 0}`));
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        logEvent(`Unhandled promise rejection: ${error?.name || 'Error'}: ${error?.message || String(error)}`);
    });

    logEvent(`Image Extractor AI workflow initialized. User agent: ${navigator.userAgent}`);
    updateButtons();
})();
