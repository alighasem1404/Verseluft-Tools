(function (global) {
    'use strict';

    const familyEngine = global.NpcFamilyMakerEngine;
    if (!familyEngine) throw new Error('Civil Registry Maker requires the NPC Family Maker engine.');

    const DEFAULT_CLASS_PERCENTAGES = { Lower: 40, Medium: 40, Upper: 20 };
    const PAGE_LINE_CAPACITY = 260;
    const WRAP_LINE_LENGTH = 60;

    function parseCsvLine(line) {
        const cells = [];
        let cell = '';
        let quoted = false;
        for (let index = 0; index < line.length; index += 1) {
            const character = line[index];
            if (character === '"' && line[index + 1] === '"' && quoted) {
                cell += '"';
                index += 1;
            } else if (character === '"') {
                quoted = !quoted;
            } else if (character === ',' && !quoted) {
                cells.push(cell.trim());
                cell = '';
            } else {
                cell += character;
            }
        }
        cells.push(cell.trim());
        return cells;
    }

    function parseName(fullName) {
        const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
        if (parts.length < 2) return { firstName: parts[0] || 'Unnamed', surname: 'Unknown' };
        return { firstName: parts.shift(), surname: parts.join(' ') };
    }

    function normalizeGender(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (['male', 'm'].includes(normalized)) return 'Male';
        if (['female', 'f'].includes(normalized)) return 'Female';
        if (['non-binary', 'nonbinary', 'non binary', 'nb'].includes(normalized)) return 'Non-binary';
        return null;
    }

    function anchorRole(familyType, gender) {
        if (['Single', 'Roommate'].includes(familyType)) return gender;
        if (gender === 'Non-binary') return 'Spouse';
        if (familyType === 'Roommate') return 'Roommate';
        if (familyType === 'Sibling') return gender === 'Male' ? 'Brother' : 'Sister';
        return gender === 'Male' ? 'Husband' : 'Wife';
    }

    function parseAnchors(text, races = familyEngine.RACES) {
        const errors = [];
        const anchors = [];
        const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        lines.forEach((line, index) => {
            const cells = parseCsvLine(line);
            if (index === 0 && cells[0]?.toLowerCase() === 'name') return;
            if (cells.length < 5) {
                errors.push(`Anchor line ${index + 1} must contain name, sex, race, age, and roll.`);
                return;
            }
            const gender = normalizeGender(cells[1]);
            const rawRace = String(cells[2] || '').trim();
            const race = rawRace.toLowerCase() === 'elf' ? 'Elf' : familyEngine.resolveRaceName(rawRace);
            const age = Number(cells[3]);
            if (!gender) errors.push(`Anchor line ${index + 1} has an unsupported sex: ${cells[1] || '(blank)'}.`);
            if (!race || (race !== 'Elf' && !races[race])) errors.push(`Anchor line ${index + 1} has an unsupported race: ${cells[2] || '(blank)'}.`);
            if (!Number.isFinite(age) || age < 0) errors.push(`Anchor line ${index + 1} has an invalid age: ${cells[3] || '(blank)'}.`);
            const name = parseName(cells[0]);
            anchors.push({
                firstName: name.firstName,
                surname: name.surname,
                gender: gender || 'Male',
                race: race || 'Human',
                age: Number.isFinite(age) && age >= 0 ? age : 0,
                profession: cells.slice(4).join(', ').trim() || undefined,
                sourceNotes: ['Civil Registry anchor']
            });
        });
        return { anchors, errors };
    }

    function normalizePercentages(percentages = DEFAULT_CLASS_PERCENTAGES) {
        const result = {};
        for (const className of ['Lower', 'Medium', 'Upper']) {
            const value = Number(percentages[className]);
            if (!Number.isFinite(value) || value < 0) throw new Error(`${className} class percentage must be a non-negative number.`);
            result[className] = value;
        }
        const total = result.Lower + result.Medium + result.Upper;
        if (Math.abs(total - 100) > 0.001) throw new Error(`Social class percentages must total 100%; current total is ${total}%.`);
        return result;
    }

    function classEntries(percentages) {
        return Object.entries(percentages);
    }

    function chooseFamilyType(rng, familyType) {
        return familyType && familyType !== 'random' ? familyType : rng.weighted(familyEngine.FAMILY_TYPES);
    }

    function buildRegistry(options = {}) {
        const seed = String(options.seed || 'village-01');
        const familyCount = Math.floor(Number(options.familyCount));
        if (!Number.isInteger(familyCount) || familyCount < 1) throw new Error('Family count must be a positive whole number.');
        const percentages = normalizePercentages(options.classPercentages);
        const parsed = parseAnchors(options.anchorText || options.anchors || '');
        if (parsed.errors.length) throw new Error(parsed.errors.join(' '));
        if (parsed.anchors.length > familyCount) throw new Error('There cannot be more anchors than families.');

        const families = [];
        const registryRng = familyEngine.createRng(seed);
        for (let index = 0; index < familyCount; index += 1) {
            const familySeed = `${seed}:family-${index + 1}`;
            const typeRng = familyEngine.createRng(`${familySeed}:type`);
            const familyType = chooseFamilyType(typeRng, options.familyType);
            const householdClass = registryRng.weighted(classEntries(percentages));
            const sourceAnchor = parsed.anchors[index];
            const anchor = sourceAnchor ? {
                ...sourceAnchor,
                relationshipRole: anchorRole(familyType, sourceAnchor.gender),
                lockedFields: ['firstName', 'race', 'age', 'gender', 'profession']
            } : undefined;
            families.push(familyEngine.buildFamily({
                seed: familySeed,
                familyType,
                householdClass,
                allowSecondWifeChance: options.allowSecondWifeChance === true,
                includeElders: options.includeElders !== false,
                ignoreFamilyMemberLimit: true,
                anchor
            }));
        }

        return {
            id: `registry-${seed}`,
            seed,
            familyCount,
            classPercentages: percentages,
            anchorCount: parsed.anchors.length,
            families,
            errors: []
        };
    }

    function familyToMarkdown(family) {
        const lines = [`The "${family.surname}" Family`, ''];
        family.members.forEach((member) => {
            const profession = member.profession ? `, ${member.profession}` : '';
            lines.push(`- ${member.firstName}, ${member.race}, ${member.age}, ${member.relationshipRole}${profession}`);
        });
        return lines.join('\n');
    }

    function familyToNumberedMarkdown(family, number) {
        const lines = [`###### ${number} The ${family.surname} Family`];
        family.members.forEach((member) => {
            const profession = member.profession ? `, ${member.profession}` : '';
            lines.push(`- ${member.firstName}, ${member.race}, ${member.age}, ${member.relationshipRole}${profession}`);
        });
        return lines.join('\n');
    }

    function wrappedLineCount(text) {
        return String(text).split('\n')
            .filter((line) => line.length > 0)
            .reduce((count, line) => count + (line.length > WRAP_LINE_LENGTH ? 2 : 1), 0);
    }

    function paginateFamilies(families) {
        const pages = [];
        let current = [];
        let usedLines = 0;
        families.forEach((family, index) => {
            const block = familyToNumberedMarkdown(family, index + 1);
            const blockCost = wrappedLineCount(block);
            if (current.length && usedLines + blockCost >= PAGE_LINE_CAPACITY) {
                pages.push(current);
                current = [];
                usedLines = 0;
            }
            current.push(block);
            usedLines += blockCost;
        });
        if (current.length) pages.push(current);
        return pages;
    }

    function toNumberedMarkdown(registry) {
        return registry.families.map((family, index) => familyToNumberedMarkdown(family, index + 1)).join('\n\n');
    }

    function toHomebreweryMarkdown(registry) {
        return paginateFamilies(registry.families).map((page) => `{{index,wide,columns:3\n\n${page.join('\n\n')}\n\n}}\n\n\\page\n`).join('\n');
    }

    function toMarkdown(registry) {
        return registry.families.map(familyToMarkdown).join('\n\n');
    }

    global.CivilRegistryMakerEngine = {
        DEFAULT_CLASS_PERCENTAGES,
        PAGE_LINE_CAPACITY,
        WRAP_LINE_LENGTH,
        parseCsvLine,
        parseAnchors,
        normalizePercentages,
        buildRegistry,
        familyToMarkdown,
        familyToNumberedMarkdown,
        wrappedLineCount,
        paginateFamilies,
        toNumberedMarkdown,
        toHomebreweryMarkdown,
        toMarkdown
    };
}(window));
