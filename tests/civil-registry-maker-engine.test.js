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

const plainElfAnchor = engine.parseAnchors('name, sex, race, age, roll\nAelar Moonwhisper, Male, Elf, 240, Archivist');
assert.equal(plainElfAnchor.errors.length, 0);
assert.equal(plainElfAnchor.anchors[0].race, 'Elf');

const singleNameAnchor = engine.parseAnchors('name, sex, race, age, roll\nSierra, Female, Human, 19, Courier');
assert.equal(singleNameAnchor.errors.length, 0);
assert.equal(singleNameAnchor.anchors[0].firstName, 'Sierra');
assert.equal(singleNameAnchor.anchors[0].surname, 'Sierra');
const singleNameRegistry = engine.buildRegistry({
    seed: 'single-name-anchor',
    familyCount: 1,
    anchorText: 'name, sex, race, age, roll\nSierra, Female, Human, 19, Courier',
    classPercentages: { Lower: 40, Medium: 40, Upper: 20 },
    familyType: 'Single',
    includeElders: false
});
assert.match(engine.toNumberedMarkdown(singleNameRegistry), /###### 1 The Sierra Family/);
const plainElfRegistry = engine.buildRegistry({
    seed: 'plain-elf-anchor',
    familyCount: 1,
    anchorText: 'name, sex, race, age, roll\nAelar Moonwhisper, Male, Elf, 240, Archivist',
    classPercentages: { Lower: 40, Medium: 40, Upper: 20 },
    familyType: 'Single',
    includeElders: false
});
assert.equal(plainElfRegistry.families[0].members[0].race, 'Elf');
assert.equal(plainElfRegistry.families[0].validationIssues.length, 0);

const addedRaceAnchors = engine.parseAnchors('name, sex, race, age, roll\nArion Cloudhoof, Male, Centaur, 34, Scout\nWillow Mossgrove, Female, Deer-folk, 29, Herbalist');
assert.equal(addedRaceAnchors.errors.length, 0);
assert.deepEqual(addedRaceAnchors.anchors.map((anchor) => anchor.race), ['Centaur', 'Deer-folk']);

const species2024Anchors = engine.parseAnchors('name, sex, race, age, roll\nGrakka Ashfang, Female, Orc, 32, Guard\nAukan Kalatak, Male, Goliath, 44, Mason');
assert.equal(species2024Anchors.errors.length, 0);
assert.deepEqual(species2024Anchors.anchors.map((anchor) => anchor.race), ['Orc', 'Goliath']);

const satyrAnchor = engine.parseAnchors('name, sex, race, age, roll\nPan Wildgrove, Male, Satyr, 26, Reveler');
assert.equal(satyrAnchor.errors.length, 0);
assert.equal(satyrAnchor.anchors[0].race, 'Satyr');

const customRaceAnchors = engine.parseAnchors('name, sex, race, age, roll\nRook Blackwing, Male, Raven, 26, Scout\nZuri Wildjaw, Female, Hyena, 31, Hunter\nAurelia Starfall, Female, Celestial, 40, Priest');
assert.equal(customRaceAnchors.errors.length, 0);
assert.deepEqual(customRaceAnchors.anchors.map((anchor) => anchor.race), ['Raven', 'Hyena', 'Celestial']);

const goblinoidAnchors = engine.parseAnchors('name, sex, race, age, roll\nBik Ashsnout, Male, Goblin, 12, Scavenger\nAsha Ashbanner, Female, Hobgoblin, 24, Soldier');
assert.equal(goblinoidAnchors.errors.length, 0);
assert.deepEqual(goblinoidAnchors.anchors.map((anchor) => anchor.race), ['Goblin', 'Hobgoblin']);

const backerOnlyRegistry = engine.buildRegistry({
    registryMode: 'backers',
    seed: 'backer-only-registry',
    familyCount: 999,
    backerTextByClass: {
        Lower: 'Sierra\nHouse Ironroot',
        Medium: 'The Marrow Guild',
        Upper: 'House Highwood\nThe Crown Estate'
    },
    classPercentages: { Lower: 40, Medium: 40, Upper: 20 },
    familyType: 'Single',
    includeElders: false
});
assert.equal(backerOnlyRegistry.registryMode, 'backers');
assert.equal(backerOnlyRegistry.familyCount, 5);
assert.equal(backerOnlyRegistry.anchorCount, 0);
assert.equal(backerOnlyRegistry.backerCount, 5);
assert.deepEqual(backerOnlyRegistry.families.map((family) => [family.householdClass, family.backerName]), [
    ['Lower', 'Sierra'], ['Lower', 'House Ironroot'], ['Medium', 'The Marrow Guild'], ['Upper', 'House Highwood'], ['Upper', 'The Crown Estate']
]);
assert.match(engine.toNumberedMarkdown(backerOnlyRegistry), /###### \(Backer's Name: Sierra\)/);

const backerAnchorText = 'name, sex, race, age, roll, backer name\nGregory Marrow, Male, Human, 58, Council Head, House Brightwater';
const backerRegistry = engine.buildRegistry({
    seed: 'backer-registry',
    familyCount: 1,
    anchorText: backerAnchorText,
    classPercentages: { Lower: 40, Medium: 40, Upper: 20 },
    familyType: 'Single',
    includeBackerNames: true,
    includeElders: false
});
assert.equal(backerRegistry.families[0].backerName, 'House Brightwater');
assert.match(engine.toNumberedMarkdown(backerRegistry), /###### \(Backer's Name: House Brightwater\)/);
const missingBackerRegistry = engine.buildRegistry({
    seed: 'missing-backer-registry',
    familyCount: 1,
    anchorText: 'name, sex, race, age, roll, backer name\nGregory Marrow, Male, Human, 58, Council Head',
    classPercentages: { Lower: 40, Medium: 40, Upper: 20 },
    familyType: 'Single',
    includeBackerNames: true,
    includeElders: false
});
assert.equal(missingBackerRegistry.families[0].backerName, null);
assert.doesNotMatch(engine.toNumberedMarkdown(missingBackerRegistry), /Backer's Name/);

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

const classAnchoredRegistry = engine.buildRegistry({
    seed: 'class-anchored-registry',
    familyCount: 5,
    anchorTextByClass: {
        Lower: 'name, sex, race, age, roll\nLena Field, Female, Human, 34, Farmer',
        Medium: 'name, sex, race, age, roll\nMarek Stone, Male, Dwarf, 105, Blacksmith',
        Upper: 'name, sex, race, age, roll\nSeraphine Gold, Female, Human, 42, Chancellor'
    },
    classPercentages: { Lower: 40, Medium: 40, Upper: 20 },
    familyType: 'Single',
    includeElders: false
});
assert.equal(classAnchoredRegistry.anchorCount, 3);
assert.deepEqual(classAnchoredRegistry.families.slice(0, 3).map((family) => family.householdClass), ['Lower', 'Medium', 'Upper']);

assert.deepEqual(engine.balancedFamilySizes(10, 4), [3, 3, 2, 2]);
const populationRegistry = engine.buildRegistry({
    seed: 'population-registry',
    familyCount: 4,
    population: 10,
    classPercentages: { Lower: 40, Medium: 40, Upper: 20 },
    familyType: 'Roommate',
    includeElders: false
});
assert.equal(populationRegistry.populationLimit, 10);
assert.equal(populationRegistry.population, 10);
assert.deepEqual(populationRegistry.families.map((family) => family.members.length), [3, 3, 2, 2]);
assert.ok(populationRegistry.families.every((family) => family.members.length > 0));
assert.throws(() => engine.buildRegistry({ familyCount: 4, population: 3, classPercentages: { Lower: 40, Medium: 40, Upper: 20 } }), /at least 4/);

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
assert.match(engine.toNumberedMarkdown({ ...longRegistry, startingNumber: 78 }), /^###### 78 The Family1 Family/);
assert.match(engine.toHomebreweryMarkdown({ ...longRegistry, startingNumber: 78 }), /###### 78 The Family1 Family/);

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
