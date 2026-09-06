(function (global) {
    'use strict';

    const WORKBOOK_DATA = global.NpcFamilyMakerWorkbookData || {};

    const FALLBACK_RACES = {
        Human: { maxAge: 100, adulthood: 18, names: ['Alden', 'Bram', 'Cassandra', 'Diana', 'Elias', 'Helena', 'Lucan', 'Mara', 'Quinn', 'Soren'], surnames: ['Blackwood', 'Goldleaf', 'Greystone', 'Ironroot', 'Ravenscroft', 'Stormrider'] },
        Elf: { maxAge: 750, adulthood: 120, names: ['Aelar', 'Aelene', 'Belegon', 'Elandor', 'Elrohir', 'Galinda', 'Lirion', 'Sereniel', 'Thalos', 'Vaelynn'], surnames: ['Moonwhisper', 'Nightbranch', 'Starwhisper', 'Sunbranch', 'Windthorn'] },
        'Half-elf': { maxAge: 180, adulthood: 20, names: ['Aelar', 'Ariawyn', 'Berrian', 'Caelen', 'Faylen', 'Gwindoriel', 'Mira', 'Rael', 'Tharin', 'Vaeryn'], surnames: ['Dawnwhisper', 'Evenwood', 'Riverglen', 'Swiftbreeze', 'Windglen'] },
        'Half-orc': { maxAge: 75, adulthood: 14, names: ['Agrok', 'Bronna', 'Drog', 'Gorthar', 'Grunt', 'Karn', 'Morga', 'Rokhan', 'Thok', 'Vasha'], surnames: ['Bloodgrip', 'Ironcleaver', 'Stonecrusher', 'Stormfist', 'Thundertusk'] },
        Dwarf: { maxAge: 350, adulthood: 100, names: ['Balin', 'Brenna', 'Dain', 'Gilly', 'Korlak', 'Morin', 'Regin', 'Svana', 'Vondal', 'Zardryn'], surnames: ['Bronzebeard', 'Cragjaw', 'Goldpeak', 'Stoneaxe', 'Stonehammer'] },
        Halfling: { maxAge: 150, adulthood: 20, names: ['Alton', 'Daisy', 'Finnan', 'Jago', 'Lila', 'Milo', 'Pippa', 'Quincy', 'Rosie', 'Tobin'], surnames: ['Appleblossom', 'Barleyfoot', 'Cloverhill', 'Dewdrop', 'Greenbottle'] },
        Gnome: { maxAge: 400, adulthood: 40, names: ['Bimpnottin', 'Dimble', 'Gozzle', 'Jinx', 'Nissa', 'Twidget', 'Wibble', 'Wizzle', 'Yumble', 'Zook'], surnames: ['Dabblegear', 'Muddlesprocket', 'Quickwhistle', 'Thimblefizz', 'Upgear'] },
        Dragonborn: { maxAge: 80, adulthood: 15, names: ['Balasar', 'Draaros', 'Ghesh', 'Heskan', 'Rhogar', 'Rynnor', 'Taenaran', 'Vezendok', 'Zhorak', 'Zorvatha'], surnames: ['Flamebrow', 'Frostjaw', 'Goldclaw', 'Ironscale', 'Whitescale'] },
        Tiefling: { maxAge: 120, adulthood: 18, names: ['Abaddon', 'Akta', 'Azazel', 'Damaia', 'Jorogumo', 'Kazanir', 'Nyx', 'Raziel', 'Xythor', 'Zariel'], surnames: ['Brimstone', 'Darkflame', 'Eclipse', 'Nightfury', 'Shadowhorn'] }
    };

    const FALLBACK_RACE_WEIGHTS = [
        ['Human', 30], ['Elf', 15], ['Half-elf', 25], ['Half-orc', 5], ['Dwarf', 5],
        ['Halfling', 5], ['Gnome', 5], ['Dragonborn', 5], ['Tiefling', 5]
    ];

    const ELF_SUBRACE_WEIGHTS = [['Wood Elf', 50], ['High Elf', 40], ['Dark Elf', 10]];
    const ELF_SUBRACE_NAMES = ELF_SUBRACE_WEIGHTS.map(([race]) => race);
    const ELF_SUBRACES = new Set(ELF_SUBRACE_NAMES);

    const FALLBACK_FAMILY_TYPES = [
        ['Single', 5], ['Roommate', 5], ['Sibling', 5], ['Gay', 5], ['Normal', 80]
    ];

    const FALLBACK_CLASS_JOBS = {
        Lower: ['Farmer', 'Shepherd', 'Brewer’s Assistant', 'Cook’s Helper', 'Fisherman', 'Gate Watchman', 'Mason’s Apprentice', 'Porter', 'Storyteller', 'Water Carrier'],
        'Young Adult': ['Apprentice Blacksmith', 'Apprentice Mason', 'Apprentice Carpenter', 'Apprentice Tailor', 'Apprentice Shoemaker', 'Apprentice Potter', 'Apprentice Weaver', 'Apprentice Fletcher', 'Apprentice Bowyer', 'Apprentice Glassblower', 'Apprentice Goldsmith', 'Apprentice Silversmith', 'Apprentice Shipwright', 'Apprentice Armorer', 'Apprentice Locksmith', 'Assistant Cook', 'Assistant Scribe', 'Junior Healer', 'Junior Apothecary', 'Junior Teacher', 'Guild Apprentice', 'Clerk', 'Page', 'Squire'],
        Medium: ['Blacksmith', 'Brewer', 'General Trader', 'Shopkeeper', 'Apothecary', 'Teacher', 'Cook', 'Baker', 'Moneychanger', 'Scribe'],
        Upper: ['Castellan', 'Magistrate', 'Chancellor', 'Treasurer', 'Diplomat / Envoy', 'Knight', 'Scholar', 'Royal Tutor', 'Court Wizard', 'Chamberlain']
    };

    const FAMILY_SURNAME_FALLBACKS = ['Leafgrove', 'Nightfury', 'Dawntracker', 'Amberglow', 'Goldleaf', 'Wildmane', 'Oakenshield', 'Silverthorn', 'Starwhisper', 'Ironfury'];

    const FALLBACK_OFFSPRING = {
        Human: { Human: 'Human', Elf: 'Half-elf', 'Half-elf': 'Human', 'Half-orc': 'Human', Dwarf: 'Human', Halfling: null, Gnome: 'Gnome', Dragonborn: null, Tiefling: 'Tiefling' },
        Elf: { Human: 'Half-elf', Elf: 'Elf', 'Half-elf': 'Elf', 'Half-orc': null, Dwarf: null, Halfling: null, Gnome: 'Elf', Dragonborn: null, Tiefling: 'Tiefling' },
        'Half-elf': { Human: 'Human', Elf: 'Elf', 'Half-elf': 'Half-elf', 'Half-orc': 'Half-orc', Dwarf: null, Halfling: null, Gnome: 'Half-elf', Dragonborn: null, Tiefling: 'Tiefling' },
        'Half-orc': { Human: 'Human', Elf: null, 'Half-elf': 'Half-elf', 'Half-orc': 'Half-orc', Dwarf: null, Halfling: null, Gnome: null, Dragonborn: null, Tiefling: 'Tiefling' },
        Dwarf: { Human: 'Human', Elf: null, 'Half-elf': null, 'Half-orc': null, Dwarf: 'Dwarf', Halfling: 'Dwarf', Gnome: 'Dwarf', Dragonborn: null, Tiefling: 'Tiefling' },
        Halfling: { Human: null, Elf: null, 'Half-elf': null, 'Half-orc': null, Dwarf: 'Dwarf', Halfling: 'Halfling', Gnome: 'Gnome', Dragonborn: null, Tiefling: null },
        Gnome: { Human: 'Gnome', Elf: 'Elf', 'Half-elf': 'Half-elf', 'Half-orc': null, Dwarf: 'Dwarf', Halfling: 'Gnome', Gnome: 'Gnome', Dragonborn: null, Tiefling: 'Tiefling' },
        Dragonborn: { Human: null, Elf: null, 'Half-elf': null, 'Half-orc': null, Dwarf: null, Halfling: null, Gnome: null, Dragonborn: 'Dragonborn', Tiefling: null },
        Tiefling: { Human: 'Tiefling', Elf: 'Tiefling', 'Half-elf': 'Tiefling', 'Half-orc': 'Tiefling', Dwarf: 'Tiefling', Halfling: null, Gnome: 'Tiefling', Dragonborn: null, Tiefling: 'Tiefling' }
    };

    const SOURCE_RACES = Object.keys(WORKBOOK_DATA.races || {}).length ? WORKBOOK_DATA.races : FALLBACK_RACES;
    const ELF_TEMPLATE = SOURCE_RACES.Elf || FALLBACK_RACES.Elf;
    const RACES = Object.fromEntries([
        ...Object.entries(SOURCE_RACES).filter(([race]) => race !== 'Elf'),
        ...ELF_SUBRACE_NAMES.map((race) => [race, { ...ELF_TEMPLATE }])
    ]);
    const SOURCE_RACE_WEIGHTS = Object.entries(WORKBOOK_DATA.main?.raceWeights || {}).length
        ? Object.entries(WORKBOOK_DATA.main.raceWeights)
        : FALLBACK_RACE_WEIGHTS;
    const RACE_WEIGHTS = SOURCE_RACE_WEIGHTS.flatMap(([race, weight]) => race === 'Elf'
        ? ELF_SUBRACE_WEIGHTS.map(([subrace, subraceWeight]) => [subrace, Number(weight) * Number(subraceWeight) / 100])
        : [[race, weight]]);
    const FAMILY_TYPES = Object.entries(WORKBOOK_DATA.main?.familyTypeWeights || {}).length
        ? Object.entries(WORKBOOK_DATA.main.familyTypeWeights)
        : FALLBACK_FAMILY_TYPES;
    const CLASS_JOBS = Object.keys(WORKBOOK_DATA.professions || {}).length
        ? Object.fromEntries(Object.entries(WORKBOOK_DATA.professions).map(([key, jobs]) => [key, jobs.map((job) => typeof job === 'string' ? job : job.title).filter(Boolean)]))
        : FALLBACK_CLASS_JOBS;
    const OFFSPRING = WORKBOOK_DATA.offspring?.ruleSet1 || FALLBACK_OFFSPRING;
    const SECOND_WIFE_CHANCE = 0.4;

    function hashSeed(value) {
        let hash = 2166136261;
        String(value || 'family').split('').forEach((char) => {
            hash ^= char.charCodeAt(0);
            hash = Math.imul(hash, 16777619);
        });
        return hash >>> 0 || 1;
    }

    function createRng(seed) {
        let state = hashSeed(seed);
        return {
            next() {
                state = (Math.imul(1664525, state) + 1013904223) >>> 0;
                return state / 4294967296;
            },
            int(min, max) {
                return Math.floor(this.next() * (max - min + 1)) + min;
            },
            pick(list) {
                return list[Math.floor(this.next() * list.length)];
            },
            weighted(entries) {
                const total = entries.reduce((sum, [, weight]) => sum + Number(weight || 0), 0);
                if (!total) return entries[0]?.[0];
                let cursor = this.next() * total;
                for (const [value, weight] of entries) {
                    cursor -= Number(weight || 0);
                    if (cursor <= 0) return value;
                }
                return entries[entries.length - 1][0];
            }
        };
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function uniqueId(index) {
        return `npc-${String(index).padStart(3, '0')}`;
    }

    function resolveRaceName(race) {
        const value = String(race || '').trim();
        const exact = Object.keys(RACES).find((candidate) => candidate === value);
        if (exact) return exact;
        const insensitive = Object.keys(RACES).find((candidate) => candidate.toLowerCase() === value.toLowerCase());
        if (insensitive) return insensitive;
        return null;
    }

    function normalizeRace(race) {
        const resolved = resolveRaceName(race);
        return resolved || 'Human';
    }

    function isPlainElf(race) {
        return String(race || '').trim().toLowerCase() === 'elf';
    }

    function getRaceData(race) {
        return isPlainElf(race) ? ELF_TEMPLATE : RACES[normalizeRace(race)];
    }

    function sourceRace(race) {
        if (isPlainElf(race)) return 'Elf';
        const resolved = resolveRaceName(race);
        return ELF_SUBRACES.has(resolved) ? 'Elf' : (resolved || 'Human');
    }

    function oppositeGender(gender) {
        return gender === 'Male' ? 'Female' : 'Male';
    }

    function getNamePool(race, gender) {
        const data = getRaceData(race);
        const genderPool = data?.[`${String(gender || '').toLowerCase()}Names`];
        return genderPool?.length ? genderPool : data?.names?.length ? data.names : ['Unnamed'];
    }

    function nameGender(rng, gender) {
        return gender === 'Non-binary' ? rng.pick(['Male', 'Female']) : gender;
    }

    function makeName(rng, race, surname, gender) {
        const data = getRaceData(race);
        return { firstName: rng.pick(getNamePool(race, nameGender(rng, gender))), surname: surname || rng.pick(data.surnames || FAMILY_SURNAME_FALLBACKS) };
    }

    function makeUniqueName(rng, race, surname, family, gender) {
        const existing = new Set(family.members.map((member) => `${member.firstName} ${member.surname}`));
        const data = getRaceData(race);
        const pool = getNamePool(race, nameGender(rng, gender));
        const available = pool.filter((firstName) => !existing.has(`${firstName} ${surname}`));
        if (available.length) return { firstName: rng.pick(available), surname };
        return { firstName: `${rng.pick(pool)}-${family.members.length + 1}`, surname };
    }

    function generateAge(rng, race, stage, parentAge) {
        const data = getRaceData(race);
        if (stage === 'child') return rng.int(0, clamp((parentAge || data.adulthood + 20) - data.adulthood, 0, 18));
        if (stage === 'elder') return rng.int(Math.max(data.adulthood + 25, Math.floor(data.maxAge * 0.45)), data.maxAge);
        return rng.int(data.adulthood, Math.max(data.adulthood, Math.floor(data.maxAge * 0.72)));
    }

    function getLifeStage(race, age) {
        const data = getRaceData(race) || {};
        const value = Number(age) || 0;
        if (value < Number(data.youngAdulthood ?? data.adulthood ?? 18)) return 'child';
        if (value < Number(data.adulthood ?? 18)) return 'youngAdult';
        return 'adult';
    }

    function chooseProfession(rng, family, race, age) {
        const stage = getLifeStage(race, age);
        if (stage === 'child') return null;
        const poolKey = stage === 'youngAdult' && family.householdClass !== 'Lower' ? 'Young Adult' : family.householdClass;
        const pool = CLASS_JOBS[poolKey] || CLASS_JOBS.Medium || [];
        return pool.length ? rng.pick(pool) : null;
    }

    function chooseRace(rng, preferred) {
        if (String(preferred || '').trim().toLowerCase() === 'elf') return rng.weighted(ELF_SUBRACE_WEIGHTS);
        return normalizeRace(preferred || rng.weighted(RACE_WEIGHTS));
    }

    function chooseSurname(rng, race) {
        const surnames = getRaceData(race)?.surnames || FAMILY_SURNAME_FALLBACKS;
        return rng.pick(surnames.length ? surnames : FAMILY_SURNAME_FALLBACKS);
    }

    function chooseChildRace(rng, firstRace, secondRace) {
        const direct = OFFSPRING[sourceRace(firstRace)]?.[sourceRace(secondRace)];
        if (direct) return direct === 'Elf' ? chooseRace(rng, 'Elf') : direct;
        const reverse = OFFSPRING[sourceRace(secondRace)]?.[sourceRace(firstRace)];
        if (reverse) return reverse === 'Elf' ? chooseRace(rng, 'Elf') : reverse;
        return rng.next() < 0.5 ? chooseRace(rng, firstRace) : chooseRace(rng, secondRace);
    }

    function addMember(family, rng, spec) {
        const race = spec.preserveRace && isPlainElf(spec.race) ? 'Elf' : chooseRace(rng, spec.race);
        const gender = spec.gender || rng.pick(['Male', 'Female']);
        const name = spec.firstName ? { firstName: spec.firstName, surname: spec.surname || family.surname } : makeUniqueName(rng, race, spec.surname || family.surname, family, gender);
        const age = spec.age ?? generateAge(rng, race, spec.stage || 'adult', spec.parentAge);
        const member = {
            id: uniqueId(family.members.length + 1),
            firstName: name.firstName,
            surname: name.surname,
            race,
            age,
            gender,
            profession: spec.profession || chooseProfession(rng, family, race, age),
            relationshipRole: spec.relationshipRole || 'Household member',
            traits: spec.traits ? [...spec.traits] : [],
            status: spec.status || 'generated',
            lockedFields: spec.lockedFields ? [...spec.lockedFields] : [],
            sourceNotes: spec.sourceNotes ? [...spec.sourceNotes] : []
        };
        family.members.push(member);
        return member;
    }

    function relate(family, fromNpcId, toNpcId, type) {
        family.relationships.push({ id: `rel-${family.relationships.length + 1}`, fromNpcId, toNpcId, type });
    }

    function memberByRole(family, role) {
        return family.members.find((member) => member.relationshipRole === role);
    }

    function buildFamily(options = {}) {
        const seed = String(options.seed || `family-${Date.now()}`);
        const rng = createRng(seed);
        const requestedTargetMemberCount = options.targetMemberCount === undefined || options.targetMemberCount === null
            ? null
            : Number(options.targetMemberCount);
        const targetMemberCount = Number.isInteger(requestedTargetMemberCount) && requestedTargetMemberCount > 0
            ? requestedTargetMemberCount
            : null;
        const family = {
            id: `family-${hashSeed(seed).toString(16)}`,
            seed,
            surname: options.anchor?.surname || null,
            familyType: options.familyType && options.familyType !== 'random' ? options.familyType : rng.weighted(FAMILY_TYPES),
            householdClass: options.householdClass || 'Medium',
            members: [],
            relationships: [],
            location: null,
            secrets: [],
            ruleSetVersion: 'workbook-v1',
            validationIssues: [],
            flags: { mixedRace: false, widow: false, coreDeath: false, secondWife: false },
            enforceMaxFamilyMembers: options.ignoreFamilyMemberLimit !== true,
            targetMemberCount
        };

        const hasRoom = (count = 1) => targetMemberCount === null || family.members.length + count <= targetMemberCount;

        const anchor = options.anchor || {};
        const coreGender = anchor.gender || rng.pick(['Male', 'Female']);
        const coreRace = anchor.race || chooseRace(rng);
        if (!family.surname) family.surname = chooseSurname(rng, coreRace);
        const coreRole = ['Single', 'Roommate'].includes(family.familyType)
            ? coreGender
            : coreGender === 'Non-binary'
                ? 'Spouse'
                : family.familyType === 'Sibling'
                    ? (coreGender === 'Male' ? 'Brother' : 'Sister')
                    : (coreGender === 'Male' ? 'Husband' : 'Wife');
        const core = addMember(family, rng, {
            firstName: anchor.firstName,
            surname: family.surname,
            race: coreRace,
            age: anchor.age,
            gender: coreGender,
            profession: anchor.profession,
            relationshipRole: anchor.relationshipRole || coreRole,
            status: anchor.status,
            lockedFields: anchor.lockedFields || (options.anchor ? ['firstName', 'race', 'age', 'gender', 'profession'] : []),
            traits: anchor.traits,
            preserveRace: isPlainElf(anchor.race),
            sourceNotes: options.anchor ? ['Designed anchor NPC'] : []
        });

        const defaultPartnerCount = ['Normal', 'Gay'].includes(family.familyType) && !options.anchor?.widow ? 1 : 0;
        const widow = defaultPartnerCount === 1 && rng.next() < Number(WORKBOOK_DATA.main?.controls?.widowChance || 15) / 100;
        family.flags.widow = widow;
        if (widow) family.flags.coreDeath = rng.next() < 0.5;
        const allowSecondWifeChance = options.allowSecondWifeChance ?? options.includeSecondWife;
        const secondWifeFits = targetMemberCount === null || family.members.length + 4 <= targetMemberCount;
        const hasSecondWife = family.familyType === 'Normal' && Boolean(allowSecondWifeChance) && !widow && secondWifeFits && rng.next() < SECOND_WIFE_CHANCE;
        family.flags.secondWife = hasSecondWife;
        const partnerCount = defaultPartnerCount + (hasSecondWife ? 1 : 0);
        const partners = [];
        for (let index = 0; index < partnerCount && !widow; index += 1) {
            const isSecondWife = index === 1;
            if (!hasRoom(isSecondWife ? 3 : 1)) break;
            const partnerGender = isSecondWife ? 'Female' : core.gender === 'Non-binary' ? rng.pick(['Male', 'Female']) : family.familyType === 'Gay' ? core.gender : oppositeGender(core.gender);
            const partnerRace = options.partnerRace && !isSecondWife ? options.partnerRace : (rng.next() < Number(WORKBOOK_DATA.main?.controls?.mixedRaceChance || 20) / 100 ? chooseRace(rng) : core.race);
            const partnerRole = partnerGender === 'Male' ? 'Husband' : 'Wife';
            const partner = addMember(family, rng, { race: partnerRace, gender: partnerGender, relationshipRole: partnerRole, age: generateAge(rng, partnerRace, 'adult'), sourceNotes: isSecondWife ? ['Second wife/partner branch'] : [] });
            partners.push(partner);
            relate(family, core.id, partner.id, 'partner');
            relate(family, partner.id, core.id, 'partner');
            family.flags.mixedRace = sourceRace(partner.race) !== sourceRace(core.race);
            if (isSecondWife) {
                const parentLabel = `Wife ${index + 1}`;
                [['Father', 'Male'], ['Mother', 'Female']].forEach(([parentType, gender]) => {
                    const parent = addMember(family, rng, { race: partner.race, surname: partner.surname, gender, relationshipRole: `${parentLabel}'s ${parentType}`, stage: 'elder', sourceNotes: ['Second wife family branch'] });
                    relate(family, parent.id, partner.id, 'parent of');
                });
            }
        }

        const parentAge = Math.max(core.age, ...partners.map((partner) => partner.age));

        if (['Normal', 'Gay'].includes(family.familyType)) {
            const requestedChildren = options.childCount ?? rng.int(0, Math.min(5, WORKBOOK_DATA.main?.controls?.maxFamilyMembers || 10));
            const childCount = hasSecondWife ? Math.max(requestedChildren, partners.length) : requestedChildren;
            for (let i = 0; i < childCount && hasRoom(); i += 1) {
                const childPartner = partners.length ? partners[i % partners.length] : null;
                const childRace = chooseChildRace(rng, core.race, childPartner?.race || core.race);
                const gender = rng.pick(['Male', 'Female']);
                const child = addMember(family, rng, { race: childRace, gender, relationshipRole: gender === 'Male' ? 'Son' : 'Daughter', stage: 'child', parentAge });
                relate(family, child.id, core.id, 'child of');
                if (childPartner) relate(family, child.id, childPartner.id, 'child of');
            }
        }

        if (family.familyType !== 'Roommate') {
            const maxSiblings = Math.min(5, WORKBOOK_DATA.main?.controls?.maxSiblings || 5);
            const siblingCount = options.siblingCount !== undefined
                ? options.siblingCount
                : family.familyType === 'Sibling'
                    ? rng.int(1, maxSiblings)
                    : ['Normal', 'Gay', 'Single'].includes(family.familyType) && rng.next() < Number(WORKBOOK_DATA.main?.controls?.siblingInFamily || 10) / 100
                        ? rng.int(1, maxSiblings)
                        : 0;
            for (let i = 0; i < siblingCount && hasRoom(); i += 1) {
                const gender = rng.pick(['Male', 'Female']);
                const sibling = addMember(family, rng, { race: core.race, gender, relationshipRole: gender === 'Male' ? 'Brother' : 'Sister', age: clamp(core.age + rng.int(-18, 18), 0, getRaceData(core.race).maxAge) });
                relate(family, sibling.id, core.id, 'sibling');
                relate(family, core.id, sibling.id, 'sibling');
            }
        }

        if (['Normal', 'Gay', 'Sibling'].includes(family.familyType)) {
            const paternalChance = options.includeElders === false ? 0 : Number(WORKBOOK_DATA.main?.controls?.paternalElderChance || 20) / 100;
            const maternalChance = options.includeElders === false ? 0 : Number(WORKBOOK_DATA.main?.controls?.maternalElderChance || 20) / 100;
            const elderSpecs = [
                ['Paternal Grandfather', 'Male', paternalChance], ['Paternal Grandmother', 'Female', paternalChance],
                ['Maternal Grandfather', 'Male', maternalChance], ['Maternal Grandmother', 'Female', maternalChance]
            ];
            elderSpecs.forEach(([role, gender, chance]) => {
                if (rng.next() < chance && hasRoom()) {
                    const elder = addMember(family, rng, { race: core.race, gender, relationshipRole: role, stage: 'elder' });
                    relate(family, elder.id, core.id, 'elder of');
                }
            });
        }

        if (family.familyType === 'Roommate') {
            const roommateCount = options.roommateCount ?? rng.int(1, Math.min(4, WORKBOOK_DATA.main?.controls?.maxRoommates || 5));
            for (let i = 0; i < roommateCount && hasRoom(); i += 1) {
                const roommate = addMember(family, rng, { race: chooseRace(rng), relationshipRole: 'Household member' });
                roommate.relationshipRole = roommate.gender;
                relate(family, roommate.id, core.id, 'roommate');
            }
        }

        const singleClassCanHaveServants = family.familyType !== 'Single' || ['Medium', 'Upper'].includes(family.householdClass);
        if (family.familyType !== 'Roommate' && singleClassCanHaveServants) {
            const servantChance = family.householdClass === 'Upper' ? 0.9 : family.householdClass === 'Medium' ? Number(WORKBOOK_DATA.main?.controls?.middleClassServantChance || 60) / 100 : 0.15;
            const servantCount = options.servantCount ?? (rng.next() < servantChance ? (family.householdClass === 'Upper' ? rng.int(1, 4) : rng.int(1, 2)) : 0);
            for (let i = 0; i < servantCount && hasRoom(); i += 1) {
                const servant = addMember(family, rng, { race: chooseRace(rng), relationshipRole: 'Servant' });
                relate(family, servant.id, core.id, 'serves');
            }
        }

        while (targetMemberCount !== null && hasRoom()) {
            const gender = rng.pick(['Male', 'Female']);
            if (family.familyType === 'Roommate') {
                const roommate = addMember(family, rng, { race: chooseRace(rng), gender, relationshipRole: gender });
                relate(family, roommate.id, core.id, 'roommate');
            } else if (['Normal', 'Gay'].includes(family.familyType)) {
                const childPartner = partners.length ? partners[(family.members.length - 1) % partners.length] : null;
                const childRace = chooseChildRace(rng, core.race, childPartner?.race || core.race);
                const child = addMember(family, rng, { race: childRace, gender, relationshipRole: gender === 'Male' ? 'Son' : 'Daughter', stage: 'child', parentAge });
                relate(family, child.id, core.id, 'child of');
                if (childPartner) relate(family, child.id, childPartner.id, 'child of');
            } else if (family.familyType === 'Sibling' || family.familyType === 'Single') {
                const sibling = addMember(family, rng, { race: core.race, gender, relationshipRole: gender === 'Male' ? 'Brother' : 'Sister', age: clamp(core.age + rng.int(-18, 18), 0, getRaceData(core.race).maxAge) });
                relate(family, sibling.id, core.id, 'sibling');
                relate(family, core.id, sibling.id, 'sibling');
            } else {
                const member = addMember(family, rng, { race: chooseRace(rng), gender, relationshipRole: 'Household member' });
                relate(family, member.id, core.id, 'household member');
            }
        }

        family.validationIssues = validateFamily(family);
        return family;
    }

    function validateFamily(family) {
        const issues = [];
        const ids = new Set();
        family.members.forEach((member) => {
            if (ids.has(member.id)) issues.push(`Duplicate NPC id: ${member.id}`);
            ids.add(member.id);
            const raceData = member.race === 'Elf' ? ELF_TEMPLATE : RACES[member.race];
            if (!raceData) issues.push(`${member.firstName} has an unsupported race.`);
            if (!Number.isFinite(Number(member.age)) || member.age < 0) issues.push(`${member.firstName} has an invalid age.`);
            if (raceData && member.age > raceData.maxAge) issues.push(`${member.firstName} exceeds the source maximum age for ${member.race}.`);
        });
        family.relationships.forEach((relationship) => {
            if (!ids.has(relationship.fromNpcId) || !ids.has(relationship.toNpcId)) issues.push(`Broken relationship: ${relationship.type}.`);
        });
        if (family.enforceMaxFamilyMembers !== false && family.members.length > 10) issues.push('Household exceeds the source maximum-family-member setting of 10.');
        if (family.familyType === 'Normal' && !family.members.some((member) => ['Husband', 'Wife', 'Spouse'].includes(member.relationshipRole))) issues.push('Normal family has no spouse or partner.');
        return [...new Set(issues)];
    }

    function rerollMember(family, memberId) {
        const target = family.members.find((member) => member.id === memberId);
        if (!target) return family;
        const rng = createRng(`${family.seed}:${memberId}:${target.firstName}:${target.age}`);
        const replacement = { ...target };
        const locked = new Set(target.lockedFields || []);
        if (!locked.has('firstName')) replacement.firstName = makeName(rng, target.race, target.surname, target.gender).firstName;
        if (!locked.has('race')) replacement.race = chooseRace(rng);
        if (!locked.has('age')) replacement.age = generateAge(rng, replacement.race, ['Son', 'Daughter'].includes(target.relationshipRole) ? 'child' : 'adult');
        if (!locked.has('gender')) replacement.gender = rng.pick(['Male', 'Female', 'Non-binary']);
        if (!locked.has('profession')) replacement.profession = chooseProfession(rng, family, replacement.race, replacement.age);
        replacement.status = 'generated';
        const nextFamily = { ...family, members: family.members.map((member) => member.id === memberId ? replacement : member) };
        nextFamily.validationIssues = validateFamily(nextFamily);
        return nextFamily;
    }

    function rerollField(family, memberId, field) {
        const target = family.members.find((member) => member.id === memberId);
        if (!target || !['firstName', 'race', 'age', 'gender', 'profession'].includes(field)) return family;
        if ((target.lockedFields || []).includes(field)) return family;
        const rng = createRng(`${family.seed}:${memberId}:${field}:${target[field]}`);
        const replacement = { ...target };
        if (field === 'firstName') replacement.firstName = makeUniqueName(rng, target.race, target.surname, family, target.gender).firstName;
        if (field === 'race') replacement.race = chooseRace(rng);
        if (field === 'age') replacement.age = generateAge(rng, replacement.race, ['Son', 'Daughter'].includes(target.relationshipRole) ? 'child' : 'adult', target.age);
        if (field === 'gender') replacement.gender = rng.pick(['Male', 'Female', 'Non-binary']);
        if (field === 'profession') replacement.profession = chooseProfession(rng, family, replacement.race, replacement.age);
        if (['race', 'age'].includes(field) && !(target.lockedFields || []).includes('profession')) replacement.profession = chooseProfession(rng, family, replacement.race, replacement.age);
        replacement.status = 'generated';
        const nextFamily = { ...family, members: family.members.map((member) => member.id === memberId ? replacement : member) };
        nextFamily.validationIssues = validateFamily(nextFamily);
        return nextFamily;
    }

    function updateMember(family, memberId, changes) {
        const nextFamily = { ...family, members: family.members.map((member) => member.id === memberId ? { ...member, ...changes, status: 'edited' } : member) };
        nextFamily.validationIssues = validateFamily(nextFamily);
        return nextFamily;
    }

    function toMarkdown(family) {
        const lines = [`# The ${family.surname} Household`, '', `- Family type: ${family.familyType}`, `- Household class: ${family.householdClass}`, `- Seed: ${family.seed}`, ''];
        family.members.forEach((member) => {
            const profession = member.profession ? `, ${member.profession}` : '';
            lines.push(`- **${member.firstName} ${member.surname}** — ${member.race}, ${member.age}, ${member.gender}, ${member.relationshipRole}${profession}`);
        });
        if (family.validationIssues.length) lines.push('', '## Validation notes', ...family.validationIssues.map((issue) => `- ${issue}`));
        return lines.join('\n');
    }

    global.NpcFamilyMakerEngine = {
        RACES,
        ELF_SUBRACE_WEIGHTS,
        FAMILY_TYPES,
        CLASS_JOBS,
        SECOND_WIFE_CHANCE,
        getLifeStage,
        resolveRaceName,
        buildFamily,
        createRng,
        rerollMember,
        rerollField,
        updateMember,
        validateFamily,
        toMarkdown
    };
}(window));
