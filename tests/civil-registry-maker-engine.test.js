const assert = require('node:assert/strict');

global.window = {};
require('../Data/npc-family-maker-data.js');
require('../npc-family-maker-engine.js');
require('../civil-registry-maker-engine.js');

const engine = window.CivilRegistryMakerEngine;

const parsed = engine.parseAnchors('name, sex, race, age, roll\nGregory Marrow, Male, Human, 58, Head of the Hearth Council\n"Anne, the Elder", Female, High Elf, 190, Keeper');
assert.equal(parsed.errors.length, 0);
assert.deepEqual(parsed.anchors[0], {
    firstName: 'Gregory',
    surname: 'Marrow',
    gender: 'Male',
    race: 'Human',
    age: 58,
    profession: 'Head of the Hearth Council',
    sourceNotes: ['Civil Registry anchor']
});
assert.equal(parsed.anchors[1].firstName, 'Anne,');
assert.equal(parsed.anchors[1].surname, 'the Elder');

const subraceAnchor = engine.parseAnchors('name, sex, race, age, roll\nNyx Starfall, Non-binary, Wood Elf, 130, Archivist');
assert.equal(subraceAnchor.errors.length, 0);
assert.equal(subraceAnchor.anchors[0].gender, 'Non-binary');
assert.equal(subraceAnchor.anchors[0].race, 'Wood Elf');

assert.throws(() => engine.normalizePercentages({ Lower: 40, Medium: 40, Upper: 10 }), /total 100/);
assert.throws(() => engine.parseAnchors('name, sex, race, age, roll\nBad, Unknown, Human, 20, Job').errors.length && engine.buildRegistry({ familyCount: 1, anchorText: 'name, sex, race, age, roll\nBad, Unknown, Human, 20, Job' }), /unsupported sex/);

const registry = engine.buildRegistry({
    seed: 'registry-test',
    familyCount: 4,
    anchorText: 'name, sex, race, age, roll\nGregory Marrow, Male, Human, 58, Head of the Hearth Council\nMadeleine Highwood, Female, Human, 44, Chancellor',
    classPercentages: { Lower: 50, Medium: 25, Upper: 25 },
    familyType: 'Normal',
    allowSecondWifeChance: false,
    includeElders: false
});
assert.equal(registry.families.length, 4);
assert.equal(registry.anchorCount, 2);
assert.equal(registry.families[0].members[0].firstName, 'Gregory');
assert.equal(registry.families[0].members[0].relationshipRole, 'Husband');
assert.equal(registry.families[0].members[0].profession, 'Head of the Hearth Council');
assert.equal(registry.families[1].members[0].firstName, 'Madeleine');
assert.equal(registry.families[1].members[0].relationshipRole, 'Wife');
assert.equal(registry.families.every((family) => family.enforceMaxFamilyMembers === false), true);
assert.equal(registry.families.every((family) => !family.validationIssues.some((issue) => issue.includes('maximum-family-member'))), true);
assert.equal(registry.families.every((family) => ['Lower', 'Medium', 'Upper'].includes(family.householdClass)), true);
assert.match(engine.toMarkdown(registry), /^The "Marrow" Family\n\n- Gregory, Human, 58, Husband, Head of the Hearth Council/);

const nonBinaryRegistry = engine.buildRegistry({
    seed: 'non-binary-registry',
    familyCount: 1,
    anchorText: 'name, sex, race, age, roll\nNyx Starfall, Non-binary, Wood Elf, 130, Archivist',
    classPercentages: { Lower: 40, Medium: 40, Upper: 20 },
    familyType: 'Normal',
    includeElders: false
});
assert.equal(nonBinaryRegistry.families[0].members[0].race, 'Wood Elf');
assert.equal(nonBinaryRegistry.families[0].members[0].relationshipRole, 'Spouse');
assert.match(engine.toMarkdown(nonBinaryRegistry), /^The "Starfall" Family\n\n- Nyx, Wood Elf, 130, Spouse, Archivist/);

const singleGenderRegistry = engine.buildRegistry({
    seed: 'single-gender-registry',
    familyCount: 1,
    anchorText: 'name, sex, race, age, roll\nMara Vale, Female, Human, 34, Baker',
    classPercentages: { Lower: 40, Medium: 40, Upper: 20 },
    familyType: 'Single',
    includeElders: false
});
assert.match(engine.toMarkdown(singleGenderRegistry), /^The "Vale" Family\n\n- Mara, Human, 34, Female, Baker/);

assert.equal(engine.wrappedLineCount('x'.repeat(60)), 1);
assert.equal(engine.wrappedLineCount('x'.repeat(61)), 2);
assert.equal(engine.wrappedLineCount('heading\n\nmember\n'), 2, 'blank and trailing lines should match the spreadsheet count');
const longRegistry = {
    families: Array.from({ length: 100 }, (_, index) => ({
        surname: `Family${index + 1}`,
        members: [{ firstName: `Member${index + 1}`, race: 'Human', age: 30, relationshipRole: 'Male', profession: 'A'.repeat(40) }]
    }))
};
const pages = engine.paginateFamilies(longRegistry.families);
assert.ok(pages.length > 1, 'long registries should be split into multiple pages');
assert.equal(pages.flat().length, longRegistry.families.length, 'page splitting must not drop or duplicate families');
const homebrewery = engine.toHomebreweryMarkdown(longRegistry);
assert.match(homebrewery, /^\{\{index,wide,columns:3/);
assert.match(homebrewery, /\\page/);
assert.match(homebrewery, /###### 100 The Family100 Family/);

const reproducible = engine.buildRegistry({
    seed: 'registry-test',
    familyCount: 4,
    anchorText: 'name, sex, race, age, roll\nGregory Marrow, Male, Human, 58, Head of the Hearth Council\nMadeleine Highwood, Female, Human, 44, Chancellor',
    classPercentages: { Lower: 50, Medium: 25, Upper: 25 },
    familyType: 'Normal',
    allowSecondWifeChance: false,
    includeElders: false
});
assert.deepEqual(registry, reproducible);

console.log('Civil Registry Maker engine tests passed (anchors, class distribution, role conversion, export, and no family-size cap).');
