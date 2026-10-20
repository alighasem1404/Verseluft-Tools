const assert = require('node:assert/strict');

global.window = {};
require('../Data/npc-family-maker-data.js');
require('../npc-family-maker-engine.js');

const data = window.NpcFamilyMakerWorkbookData;
const engine = window.NpcFamilyMakerEngine;

assert.equal(data.schemaVersion, '1.1.0');
assert.equal(Object.keys(data.races).length, 9);
assert.ok(data.races.Human.maleNames.length > 200);
assert.ok(data.races.Elf.femaleNames.length > 200);
assert.ok(data.races.Tiefling.surnames.length > 200);
assert.equal(data.professions.Lower.length, 79);
assert.equal(data.professions.Medium.length, 66);
assert.equal(data.professions.Upper.length, 42);
assert.equal(data.professions['Young Adult'].length, 24);
assert.equal(data.offspring.ruleSet1.Human.Elf, 'Half-elf');
assert.equal(data.offspring.ruleSet2.Dwarf.Halfling, 'Halfling');
assert.equal(data.main.controls.maxFamilyMembers, 10);
assert.equal(data.main.controls.widowChance, 15);
assert.equal(Object.prototype.hasOwnProperty.call(engine.RACES, 'Elf'), false);
assert.deepEqual(Object.keys(engine.RACES).filter((race) => race.toLowerCase().includes('elf')), ['Half-elf', 'Wood Elf', 'High Elf', 'Dark Elf']);
assert.equal(engine.resolveRaceName('wood elf'), 'Wood Elf');
assert.equal(engine.resolveRaceName('Elf'), null);
assert.equal(engine.resolveRaceName('centaur'), 'Centaur');
assert.equal(engine.resolveRaceName('Deer-folk'), 'Deer-folk');
assert.equal(engine.resolveRaceName('orc'), 'Orc');
assert.equal(engine.resolveRaceName('goliath'), 'Goliath');
assert.equal(engine.resolveRaceName('satyr'), 'Satyr');
assert.equal(engine.resolveRaceName('raven'), 'Raven');
assert.equal(engine.resolveRaceName('hyena'), 'Hyena');
assert.equal(engine.resolveRaceName('celestial'), 'Celestial');
assert.equal(engine.resolveRaceName('goblin'), 'Goblin');
assert.equal(engine.resolveRaceName('hobgoblin'), 'Hobgoblin');
assert.ok(engine.RACES.Centaur);
assert.ok(engine.RACES['Deer-folk']);
assert.ok(engine.RACES.Orc);
assert.ok(engine.RACES.Goliath);
assert.ok(engine.RACES.Satyr);
assert.ok(engine.RACES.Raven);
assert.ok(engine.RACES.Hyena);
assert.ok(engine.RACES.Celestial);
assert.ok(engine.RACES.Goblin);
assert.ok(engine.RACES.Hobgoblin);

const lifeStageExpectations = [
    ['Human', 13, 'child'], ['Human', 14, 'youngAdult'], ['Human', 18, 'adult'],
    ['Wood Elf', 95, 'child'], ['Wood Elf', 96, 'youngAdult'], ['Wood Elf', 120, 'adult'],
    ['Half-elf', 15, 'child'], ['Half-elf', 16, 'youngAdult'], ['Half-elf', 20, 'adult'],
    ['Half-orc', 10, 'child'], ['Half-orc', 11, 'youngAdult'], ['Half-orc', 14, 'adult'],
    ['Dwarf', 79, 'child'], ['Dwarf', 80, 'youngAdult'], ['Dwarf', 100, 'adult'],
    ['Halfling', 15, 'child'], ['Halfling', 16, 'youngAdult'], ['Halfling', 20, 'adult'],
    ['Gnome', 31, 'child'], ['Gnome', 32, 'youngAdult'], ['Gnome', 40, 'adult'],
    ['Dragonborn', 11, 'child'], ['Dragonborn', 12, 'youngAdult'], ['Dragonborn', 15, 'adult'],
    ['Tiefling', 13, 'child'], ['Tiefling', 14, 'youngAdult'], ['Tiefling', 18, 'adult'],
    ['Orc', 13, 'child'], ['Orc', 14, 'youngAdult'], ['Orc', 18, 'adult'],
    ['Goliath', 13, 'child'], ['Goliath', 14, 'youngAdult'], ['Goliath', 18, 'adult'],
    ['Satyr', 13, 'child'], ['Satyr', 14, 'youngAdult'], ['Satyr', 18, 'adult'],
    ['Raven', 13, 'child'], ['Raven', 14, 'youngAdult'], ['Raven', 18, 'adult'],
    ['Hyena', 13, 'child'], ['Hyena', 14, 'youngAdult'], ['Hyena', 18, 'adult'],
    ['Celestial', 13, 'child'], ['Celestial', 14, 'youngAdult'], ['Celestial', 18, 'adult'],
    ['Goblin', 5, 'child'], ['Goblin', 6, 'youngAdult'], ['Goblin', 8, 'adult'],
    ['Hobgoblin', 13, 'child'], ['Hobgoblin', 14, 'youngAdult'], ['Hobgoblin', 18, 'adult']
];
for (const [race, age, stage] of lifeStageExpectations) assert.equal(engine.getLifeStage(race, age), stage);

const modes = ['Normal', 'Gay', 'Sibling', 'Roommate', 'Single'];
for (const familyType of modes) {
    const first = engine.buildFamily({ seed: `test-${familyType}`, familyType, householdClass: 'Medium' });
    const second = engine.buildFamily({ seed: `test-${familyType}`, familyType, householdClass: 'Medium' });
    assert.deepEqual(first, second, `${familyType} generation must be reproducible`);
    assert.ok(first.members.length >= 1);
    assert.equal(new Set(first.members.map((member) => member.id)).size, first.members.length);
    assert.equal(new Set(first.members.map((member) => `${member.firstName} ${member.surname}`)).size, first.members.length);
    assert.equal(first.validationIssues.length, 0, `${familyType} should validate`);
    for (const relationship of first.relationships) {
        assert.ok(first.members.some((member) => member.id === relationship.fromNpcId));
        assert.ok(first.members.some((member) => member.id === relationship.toNpcId));
    }
}

const controlled = engine.buildFamily({
    seed: 'controlled-household',
    familyType: 'Normal',
    householdClass: 'Upper',
    childCount: 3,
    servantCount: 2,
    includeElders: false
});
assert.equal(controlled.members.filter((member) => ['Son', 'Daughter'].includes(member.relationshipRole)).length, 3);
assert.equal(controlled.members.filter((member) => member.relationshipRole === 'Servant').length, 2);
assert.equal(controlled.members.some((member) => member.relationshipRole.includes('Grand')), false);

const roommates = engine.buildFamily({ seed: 'controlled-roommates', familyType: 'Roommate', householdClass: 'Lower', roommateCount: 4 });
assert.equal(roommates.members.length, 5);
assert.equal(roommates.members.every((member) => [ 'Male', 'Female', 'Non-binary' ].includes(member.relationshipRole)), true);

const secondWifeFamily = engine.buildFamily({
    seed: 'second-wife-1',
    familyType: 'Normal',
    householdClass: 'Medium',
    allowSecondWifeChance: true,
    childCount: 2,
    siblingCount: 0,
    servantCount: 0,
    includeElders: false
});
assert.equal(secondWifeFamily.flags.secondWife, true, 'the enabled Normal-family chance should sometimes produce a second wife');
const partnerIds = secondWifeFamily.relationships.filter((relationship) => relationship.fromNpcId === secondWifeFamily.members[0].id && relationship.type === 'partner').map((relationship) => relationship.toNpcId);
assert.equal(partnerIds.length, 2);
assert.equal(new Set(partnerIds).size, 2);
assert.equal(secondWifeFamily.members.filter((member) => ['Son', 'Daughter'].includes(member.relationshipRole)).length, 2);
assert.equal(secondWifeFamily.members.filter((member) => member.relationshipRole.startsWith('Wife 2\'s')).length, 2);

const secondWifeAbsent = engine.buildFamily({ seed: 'second-wife-3', familyType: 'Normal', householdClass: 'Medium', allowSecondWifeChance: true, childCount: 0, includeElders: false, servantCount: 0 });
assert.equal(secondWifeAbsent.flags.secondWife, false, 'the enabled second-wife branch must remain chance-based');
for (const familyType of modes.filter((type) => type !== 'Normal')) {
    const unsupportedSecondWife = engine.buildFamily({ seed: `second-wife-${familyType}`, familyType, householdClass: 'Medium', allowSecondWifeChance: true, childCount: 2, servantCount: 0, includeElders: false });
    assert.equal(unsupportedSecondWife.flags.secondWife, false, `${familyType} must not generate a second-wife branch`);
    assert.equal(unsupportedSecondWife.members.some((member) => member.relationshipRole.startsWith('Wife 2\'s')), false);
}

const singleMedium = engine.buildFamily({ seed: 'single-medium-servants', familyType: 'Single', householdClass: 'Medium', servantCount: 2 });
assert.equal(singleMedium.members.filter((member) => member.relationshipRole === 'Servant').length, 2);
const singleUpper = engine.buildFamily({ seed: 'single-upper-servants', familyType: 'Single', householdClass: 'Upper', servantCount: 2 });
assert.equal(singleUpper.members.filter((member) => member.relationshipRole === 'Servant').length, 2);
const singleLower = engine.buildFamily({ seed: 'single-lower-servants', familyType: 'Single', householdClass: 'Lower', servantCount: 2 });
assert.equal(singleLower.members.filter((member) => member.relationshipRole === 'Servant').length, 0);

const siblingFlagFamily = engine.buildFamily({ seed: 'sibling-field', familyType: 'Normal', householdClass: 'Medium', siblingCount: 3, childCount: 0, servantCount: 0, includeElders: false });
assert.equal(siblingFlagFamily.members.filter((member) => ['Brother', 'Sister'].includes(member.relationshipRole)).length, 3);

const mediumYoungAdult = engine.buildFamily({ seed: 'medium-young-adult', familyType: 'Normal', householdClass: 'Medium', childCount: 0, servantCount: 0, includeElders: false, anchor: { firstName: 'Young', surname: 'Adult', race: 'Human', age: 14, gender: 'Male' } });
assert.equal(engine.getLifeStage(mediumYoungAdult.members[0].race, mediumYoungAdult.members[0].age), 'youngAdult');
assert.ok(engine.CLASS_JOBS['Young Adult'].includes(mediumYoungAdult.members[0].profession));

const lowerYoungAdult = engine.buildFamily({ seed: 'lower-young-adult', familyType: 'Normal', householdClass: 'Lower', childCount: 0, servantCount: 0, includeElders: false, anchor: { firstName: 'Young', surname: 'Adult', race: 'Human', age: 14, gender: 'Male' } });
assert.ok(engine.CLASS_JOBS.Lower.includes(lowerYoungAdult.members[0].profession));

const generatedChildren = engine.buildFamily({ seed: 'child-profession-rule', familyType: 'Normal', householdClass: 'Upper', childCount: 5, servantCount: 0, includeElders: false });
for (const member of generatedChildren.members) {
    if (engine.getLifeStage(member.race, member.age) === 'child') assert.equal(member.profession, null, `${member.firstName} should not have a profession before young adulthood`);
}

const editable = engine.buildFamily({ seed: 'editable-family', familyType: 'Normal', householdClass: 'Medium', childCount: 1, includeElders: false, servantCount: 0 });
const editableCore = editable.members[0];
const originalIds = editable.members.map((member) => member.id);
const originalRelationships = JSON.stringify(editable.relationships);
const rerolledAge = engine.rerollField(editable, editableCore.id, 'age');
assert.deepEqual(rerolledAge.members.map((member) => member.id), originalIds);
assert.equal(JSON.stringify(rerolledAge.relationships), originalRelationships);
assert.equal(rerolledAge.members[0].status, 'generated');

const anchorFamily = engine.buildFamily({
    seed: 'locked-anchor',
    familyType: 'Normal',
    householdClass: 'Medium',
    anchor: {
        firstName: 'Borin',
        surname: 'Stonebridge',
        race: 'Human',
        age: 62,
        gender: 'Male',
        profession: 'Retired blacksmith',
        lockedFields: ['firstName', 'race', 'age', 'gender', 'profession']
    }
});
const anchorBefore = JSON.stringify(anchorFamily.members[0]);
const anchorAfter = engine.rerollField(anchorFamily, anchorFamily.members[0].id, 'age');
assert.equal(JSON.stringify(anchorAfter.members[0]), anchorBefore, 'locked fields must not reroll');

const nonBinaryFamily = engine.buildFamily({
    seed: 'non-binary-anchor',
    familyType: 'Normal',
    householdClass: 'Medium',
    includeElders: false,
    childCount: 0,
    servantCount: 0,
    anchor: { surname: 'Nightbloom', race: 'Dark Elf', age: 58, gender: 'Non-binary' }
});
const nonBinaryCore = nonBinaryFamily.members[0];
assert.equal(nonBinaryCore.gender, 'Non-binary');
assert.equal(nonBinaryCore.relationshipRole, 'Spouse');
assert.ok([...data.races.Elf.maleNames, ...data.races.Elf.femaleNames].includes(nonBinaryCore.firstName));
assert.ok(['Husband', 'Wife'].includes(nonBinaryFamily.members.find((member) => member.id !== nonBinaryCore.id && ['Husband', 'Wife'].includes(member.relationshipRole))?.relationshipRole));
assert.equal(nonBinaryFamily.validationIssues.length, 0);

const singleAnchor = engine.buildFamily({ seed: 'single-gender-role', familyType: 'Single', householdClass: 'Medium', childCount: 0, servantCount: 0, includeElders: false, anchor: { surname: 'Singlehouse', race: 'Human', age: 34, gender: 'Female' } });
assert.equal(singleAnchor.members[0].relationshipRole, 'Female');
const roommateAnchor = engine.buildFamily({ seed: 'roommate-gender-role', familyType: 'Roommate', householdClass: 'Medium', roommateCount: 2, anchor: { surname: 'Sharedhouse', race: 'Human', age: 34, gender: 'Non-binary' } });
assert.equal(roommateAnchor.members[0].relationshipRole, 'Non-binary');
assert.equal(roommateAnchor.members.slice(1).every((member) => member.relationshipRole === member.gender), true);

console.log(`NPC Family Maker engine tests passed (${modes.length} family modes, workbook data, controls, and rerolls).`);
