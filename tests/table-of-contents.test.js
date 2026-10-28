const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildTableOfContents: build } = require('../table-of-contents.js');

test('formats the three heading levels and keeps page and source order', () => {
    const result = build('# Sylwaen\n### Behavior\n\\page\n\\page\n## Description', { startPage: 292 });
    assert.equal(result.output, '- ### [{{ Sylwaen}}{{ 292}}](#p292)\n  - [{{ Behavior}}{{ 292}}](#p292)\n- #### [{{ Description}}{{ 294}}](#p294)');
    assert.equal(result.pageCount, 3);
});

test('filters depth without losing page breaks or promoting headings', () => {
    const source = '## Child\n# Parent\n\\page\n### Detail\n\\page\n# Next';
    assert.deepEqual(build(source, { depth: 1 }).entries, [
        { level: 1, title: 'Parent', page: 1 }, { level: 1, title: 'Next', page: 3 }
    ]);
    assert.equal(build(source, { depth: 2 }).entries.length, 3);
    assert.equal(build(source, { depth: 3 }).entries.length, 4);
});

test('ignores fenced examples, comments, styles, scripts and indented code', () => {
    const source = '# Real\n````md\n# Fake\n\\page\n```\n## Still fake\n````\n~~~\n\\page\n# Fake\n~~~\n<!--\n\\page\n# Fake\n-->\n<style>\n# Fake\n\\page\n</style>\n<script>\n# Fake\n</script>\n    # Code\n    \\page\n## End';
    const result = build(source);
    assert.deepEqual(result.entries.map((entry) => entry.title), ['Real', 'End']);
    assert.equal(result.pageCount, 1);
});

test('handles Homebrewery wrappers, CRLF, closing hashes, Unicode and repeated titles', () => {
    const result = build('\uFEFF{{chapter\r\n# Sylwaën ###\r\n}}\r\n\\column\r\n## Description\r\n\\page\r\n## Description\r\n#### Too deep\r\n#No space');
    assert.deepEqual(result.entries, [
        { level: 1, title: 'Sylwaën', page: 1 },
        { level: 2, title: 'Description', page: 1 },
        { level: 2, title: 'Description', page: 2 }
    ]);
});

test('escapes brackets so titles remain inside the generated link', () => {
    assert.equal(build('# The [Old] **Forest**').output, '- ### [{{ The \\[Old\\] **Forest**}}{{ 1}}](#p1)');
});

test('handles empty sources and rejects invalid settings', () => {
    assert.equal(build('').output, '');
    assert.equal(build('### Only details', { depth: 1 }).entries.length, 0);
    for (const startPage of [0, -1, 1.5, NaN, Infinity, 1000001]) assert.throws(() => build('# Title', { startPage }));
    for (const depth of [0, 4, NaN]) assert.throws(() => build('# Title', { depth }));
});
