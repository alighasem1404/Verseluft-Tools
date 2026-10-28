const assert = require('node:assert/strict');
const { test } = require('node:test');
const { matchEmailLists: match } = require('../email-list-matcher.js');

test('outputs missing numbers separated by comma-space and emails one per line', () => {
    const result = match('existing@example.com', 'first@example.com\nexisting@example.com\nsecond@example.com\nthird@example.com', '1746\n9999\n1093\n4325');
    assert.equal(result.output, '1746, 1093, 4325');
    assert.equal(result.emailOutput, 'first@example.com\nsecond@example.com\nthird@example.com');
});

test('finds B minus A and uses original C rows, including row five of seven', () => {
    const b = Array.from({ length: 7 }, (_, i) => `person${i + 1}@example.com`);
    const a = b.filter((_, i) => i !== 4 && i !== 6);
    const result = match(a.join('\n'), b.join('\n'), '001\n002\n003\n004\n005\n006\n007');
    assert.equal(result.output, '005, 007');
    assert.equal(result.emailOutput, 'person5@example.com\nperson7@example.com');
    assert.deepEqual(result.matches.map((entry) => entry.row), [5, 7]);
    assert.equal(result.checkedCount, 7);
    assert.equal(result.excludedCount, 5);
});

test('compares trimmed emails without case sensitivity and preserves B spelling', () => {
    const result = match(' \uFEFFEXISTING@example.com \r\n', ' existing@EXAMPLE.com \r\n New@Example.com \r\n', '001\r\n +098765 \r\n');
    assert.equal(result.output, '+098765');
    assert.equal(result.emailOutput, 'New@Example.com');
});

test('keeps internal blank row positions and ignores trailing empty lines', () => {
    const result = match('', '\nfirst@example.com\n\nlast@example.com\n\n', '\n0002\n\n0004\n');
    assert.equal(result.output, '0002, 0004');
    assert.equal(result.emailOutput, 'first@example.com\nlast@example.com');
    assert.deepEqual(result.matches.map((entry) => entry.row), [2, 4]);
});

test('keeps repeated B emails aligned with each of their own numbers', () => {
    const result = match('', 'same@example.com\nsame@example.com', '01\n02');
    assert.equal(result.output, '01, 02');
    assert.equal(result.emailOutput, 'same@example.com\nsame@example.com');
});

test('empty A includes all B rows and all excluded rows produce empty outputs', () => {
    const included = match('', 'one@example.com', '001');
    assert.equal(included.output, '001');
    assert.equal(included.emailOutput, 'one@example.com');
    const result = match('one@example.com', 'ONE@example.com', '001');
    assert.equal(result.output, '');
    assert.equal(result.emailOutput, '');
    assert.equal(result.matches.length, 0);
    assert.equal(result.excludedCount, 1);
});

test('blocks unequal row counts and missing numbers rather than shifting pairs', () => {
    assert.throws(() => match('', 'one@example.com\ntwo@example.com', '01'), /B has 2; C has 1/);
    assert.throws(() => match('', 'one@example.com', '01\n02'), /B has 1; C has 2/);
    assert.throws(() => match('', 'one@example.com\ntwo@example.com\nthree@example.com', '01\n\n03'), /List C, row 2/);
});

test('reports required B and malformed emails with list and row information', () => {
    assert.throws(() => match('', '', ''), /List B is required/);
    assert.throws(() => match('ok@example.com\nbad email', 'new@example.com', '1'), /List A, row 2/);
    assert.throws(() => match('', 'ok@example.com\nwrong', '1\n2'), /List B, row 2/);
});

test('preserves leading zeros, long numbers, and phone formatting as text', () => {
    const result = match('', 'one@example.com\ntwo@example.com', '000000000000000001\n+98 (912) 123-4567');
    assert.equal(result.output, '000000000000000001, +98 (912) 123-4567');
    assert.equal(result.emailOutput, 'one@example.com\ntwo@example.com');
});
