(function () {
    'use strict';

    function readRows(value) {
        const rows = String(value).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n').map((row) => row.trim());
        while (rows.length && rows[rows.length - 1] === '') rows.pop();
        return rows;
    }

    function listError(message, field) {
        const error = new Error(message);
        error.field = field;
        return error;
    }

    function matchEmailLists(listA, listB, listC) {
        const a = readRows(listA);
        const b = readRows(listB);
        const c = readRows(listC);
        if (!b.some(Boolean)) throw listError('List B is required. Paste one email per line.', 'listB');
        if (b.length !== c.length) {
            throw listError(`Lists B and C must have the same number of rows. B has ${b.length}; C has ${c.length}. Align the original rows before processing.`, 'listC');
        }
        // Basic address shape only; this tool does not contact mail servers.
        const emailPattern = /^[^\s@,;<>]+@[^\s@,;<>]+$/;
        for (const [name, rows] of [['A', a], ['B', b]]) {
            for (let index = 0; index < rows.length; index += 1) {
                if (rows[index] && !emailPattern.test(rows[index])) {
                    throw listError(`List ${name}, row ${index + 1}: enter one email address per line.`, `list${name}`);
                }
            }
        }
        const excluded = new Set(a.filter(Boolean).map((email) => email.toLowerCase()));
        const matches = [];
        let excludedCount = 0;
        for (let index = 0; index < b.length; index += 1) {
            const email = b[index];
            if (!email) continue;
            if (!c[index]) throw listError(`List C, row ${index + 1}: a number is missing for the email on row ${index + 1} in B.`, 'listC');
            if (excluded.has(email.toLowerCase())) {
                excludedCount += 1;
                continue;
            }
            matches.push({ email, number: c[index], row: index + 1 });
        }
        return {
            output: matches.map(({ number }) => number).join(', '),
            emailOutput: matches.map(({ email }) => email).join('\n'),
            matches,
            excludedCount,
            checkedCount: b.filter(Boolean).length
        };
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = { matchEmailLists };
    if (typeof document === 'undefined') return;

    const inputs = ['listA', 'listB', 'listC'].map((id) => document.getElementById(id));
    const outputText = document.getElementById('outputText');
    const copyBtn = document.getElementById('copyBtn');
    const emailOutputText = document.getElementById('emailOutputText');
    const copyEmailsBtn = document.getElementById('copyEmailsBtn');
    const statusText = document.getElementById('statusText');
    const matchCount = document.getElementById('matchCount');

    function setStatus(message, isError = false) {
        statusText.textContent = message;
        statusText.classList.toggle('is-error', isError);
    }

    function resetOutput() {
        outputText.value = '';
        emailOutputText.value = '';
        matchCount.textContent = '0';
        copyBtn.disabled = true;
        copyEmailsBtn.disabled = true;
        inputs.forEach((input) => input.removeAttribute('aria-invalid'));
    }

    inputs.forEach((input) => input.addEventListener('input', () => {
        resetOutput();
        setStatus('Lists changed. Click Find missing emails to update the results.');
    }));

    document.getElementById('processBtn').addEventListener('click', () => {
        resetOutput();
        try {
            const result = matchEmailLists(...inputs.map((input) => input.value));
            outputText.value = result.output;
            emailOutputText.value = result.emailOutput;
            matchCount.textContent = String(result.matches.length);
            copyBtn.disabled = result.matches.length === 0;
            copyEmailsBtn.disabled = result.matches.length === 0;
            setStatus(result.matches.length
                ? `Found ${result.matches.length} email/number pair${result.matches.length === 1 ? '' : 's'}. Checked ${result.checkedCount} emails in B; ${result.excludedCount} already in A.`
                : `No missing emails. All ${result.checkedCount} emails in B are already in A.`);
        } catch (error) {
            setStatus(error.message, true);
            if (error.field) {
                const input = document.getElementById(error.field);
                input.setAttribute('aria-invalid', 'true');
                input.focus();
            }
        }
    });

    document.getElementById('exampleBtn').addEventListener('click', () => {
        inputs[0].value = 'alex@example.com\nsam@example.com';
        inputs[1].value = 'alex@example.com\nmaya@example.com\nsam@example.com\nnoor@example.com';
        inputs[2].value = '00101\n00102\n00103\n00104';
        resetOutput();
        setStatus('Example loaded. Find missing emails to get Maya with 00102 and Noor with 00104.');
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        inputs.forEach((input) => { input.value = ''; });
        resetOutput();
        setStatus('Cleared. Paste your lists to begin.');
        inputs[0].focus();
    });

    async function copyOutput(textarea, label) {
        const output = textarea.value;
        if (!output) return;
        try {
            if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(output);
            setStatus(textarea.value === output ? `${label} copied to clipboard.` : 'Previous results copied. Process the changed lists for new results.');
        } catch {
            if (textarea.value !== output) return;
            textarea.focus();
            textarea.select();
            let copied = false;
            try { copied = document.execCommand('copy'); } catch { /* Keep selection for manual copy. */ }
            setStatus(copied ? `${label} copied to clipboard.` : `${label} selected. Press Ctrl+C (or Command+C) to copy.`, !copied);
        }
    }

    copyBtn.addEventListener('click', () => copyOutput(outputText, 'Numbers'));
    copyEmailsBtn.addEventListener('click', () => copyOutput(emailOutputText, 'Missing emails'));
})();
