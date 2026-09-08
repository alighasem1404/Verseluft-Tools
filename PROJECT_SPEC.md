# NPC Family Maker — Project Specification

**Status:** Foundation specification  
**Date:** 2026-09-01  
**Product:** A local NPC-family generation tool in the Verseluft Tools hub

## 1. Product purpose

NPC Family Maker creates related households for a fantasy role-playing setting. It is different from the existing NPC generator tools in this workspace: those tools create unrelated individual NPCs, while this tool creates a connected family or household with shared names, ancestry, ages, relationships, professions, and household history.

The application must run from local files and remain useful without an online service. It should eventually use a reusable generation engine that can support the browser tool first, then a desktop wrapper or a D&D-platform integration without rewriting the rules.

## 2. Agreed product direction

- Add a new local tool to the existing Verseluft Tools hub.
- Keep the existing `NPC generator.html` and `fast batch NPC generator.html` unchanged as separate tools.
- Use the Google Sheet **New Population Maker** as the initial source of rules and data.
- Treat a family as a household: blood relatives may be accompanied by grandparents, siblings, servants, and roommates.
- Allow Single households to include servants when the household class is Medium or Upper.
- Support an optional, chance-based second-wife/partner branch for Normal families only; that partner has their own parents and children.
- Assign no profession to children below their race's young-adult threshold, use a shared Young Adult pool for Medium/Upper young adults, and use the Lower pool for Lower young adults.
- Make the sibling control generate explicit Brother/Sister members instead of remaining display-only.
- Rebuild spreadsheet behavior as structured application logic rather than copying formulas cell-for-cell.
- Preserve the spreadsheet's useful behavior while exposing broken or ambiguous behavior for deliberate resolution.
- Use TypeScript or browser-compatible JavaScript for the long-term implementation; no GPT site or hosted application is part of this scope.

## 3. MVP outcome

The first usable version should let a user:

1. Choose a family type and household class.
2. Generate a family around a generated or user-designed core NPC.
3. Generate a spouse/partner, children, grandparents, siblings, servants, and roommates according to the selected family rules, including the optional chance-based second-wife/partner branch for Normal families.
4. Keep surnames and relationships coherent across the household.
5. Edit any generated NPC and lock fields that must not change.
6. Regenerate a selected NPC or field without unnecessarily changing the rest of the family.
7. View the result as a family tree and as individual NPC cards.
8. Copy or export a family summary in a stable, readable format.
9. Generate a batch of families from a seed and export the batch.

The first implementation milestone is narrower: document the source workbook, implement the data model and seeded random engine, then build one single-family vertical slice before adding batch generation or platform integration.

## 4. Supported concepts from the source workbook

### Family types

- Normal
- Gay
- Sibling
- Roommate
- Single

The source also contains the typo `Roomate`; the application should display `Roommate` while retaining a source mapping for compatibility.

### Household classes

- Lower
- Medium
- Upper

The source's `New Profession Data` tab labels the upper class as “higher class” in one section. The application should normalize this to `Upper`.

### Races

- Human
- Wood Elf
- High Elf
- Dark Elf
- Half-elf
- Half-orc
- Dwarf
- Halfling
- Gnome
- Dragonborn
- Tiefling

All three elf subraces use the workbook's Elf rules, aging, offspring behavior, and name pools. Their internal generation weights are Wood Elf 50%, High Elf 40%, and Dark Elf 10% within the Elf branch. `Elf` is an internal compatibility category only; user-facing inputs must name Wood Elf, High Elf, or Dark Elf.

The source also has `Combination`, which represents a mixed-race branch rather than a normal race.

### Relationship roles

- Husband / spouse
- Wife / spouse
- Spouse for a non-binary core member
- Daughter
- Son
- Sister
- Brother
- Paternal grandfather
- Paternal grandmother
- Maternal grandfather
- Maternal grandmother
- Servant
- Roommate
- Second-wife/partner branch for Normal families, with that partner's parents and children

The source contains `Hasband`; this must be normalized to `Husband` in the application while remaining traceable to the source label.

## 5. Core data model

```text
Family
  id
  seed
  surname
  familyType
  householdClass
  members[]
  relationships[]
  location? 
  secrets[]
  ruleSetVersion
  validationIssues[]

NPC
  id
  firstName
  surname
  race
  age
  gender
  profession?
  relationshipRole
  traits[]
  status            generated | edited | locked | deceased
  lockedFields[]
  sourceNotes[]

Relationship
  id
  fromNpcId
  toNpcId
  type
```

The engine must distinguish generated values from user-edited and locked values. Relationships must be represented as data, not inferred only from display text.

## 6. Initial rules to reproduce

The current workbook provides these starting controls and weights:

| Rule | Source value |
|---|---:|
| Maximum family member setting | 10 |
| Widow chance | 15% |
| Core death chance | 50% |
| Paternal-side elder accompaniment | 20% |
| Maternal-side elder accompaniment | 20% |
| Gay family chance | 5% |
| Mixed-race chance | 20% |
| Non-breedable chance | 40% |
| Maximum roommates | 5 |
| Maximum siblings | 5 |
| Sibling-in-family setting | 10 |
| Elderly-in-family setting | 15 |
| Middle-class servant chance | 60% |
| Unemployment chance | 15% |

The application adds a 40% second-wife/partner chance when the user enables it for a Normal family. The branch is not generated for Gay, Sibling, Roommate, or Single families.

Family type weights currently favor Normal families:

| Type | Weight |
|---|---:|
| Single | 5 |
| Roommate | 5 |
| Sibling | 5 |
| Gay | 5 |
| Normal | 80 |

Race weights in the main control area are Human 30, Elf 15, Half-elf 25, Half-orc 5, Dwarf 5, Halfling 5, Gnome 5, Dragonborn 5, Tiefling 5, with a separate Combination branch marked 100. These values require a careful interpretation in the engine because they are not one simple normalized list.

The workbook also supplies:

- race-specific maximum ages, adulthood, mean age, and young-adulthood values;
- race-pair offspring tables for two offspring rule sets;
- race breeding/non-breeding compatibility tables;
- class-specific profession pools and demand levels;
- race- and gender-specific first-name and surname pools.
- non-binary members use a random male or female name pool while retaining `Non-binary` as their gender value.

## 7. Anchor NPC behavior

An anchor NPC is a designed or selected NPC whose important fields seed the family. For example, a user may supply a 62-year-old human widower and retired blacksmith. The engine should build the household around that NPC while respecting locked fields and age/relationship constraints.

The exact anchor editing workflow, including which fields are required and how a deceased anchor is displayed, is still to be finalized during implementation.

## 8. Output requirements

The first output should include:

- family name and family type;
- a readable household summary;
- a family tree or relationship graph;
- an NPC card for each member;
- visible validation warnings when the source rules produce an impossible or incomplete result.

Planned export formats are Markdown, HTML, PDF, CSV, and JSON. The renderer must be separate from the generation engine so one family can be exported in multiple designs.

## 8.1 Civil Registry output and history

Civil Registry Maker produces one continuous registry rather than separate regional results. Its default Homebrewery export uses the reference workbook's paging convention: three columns, a 260 calculated-line page capacity, and a 60-character wrapping threshold. A family is never split across pages; the exporter inserts `\\page` between family blocks and keeps numbering continuous across the entire registry. Civil Registry anchors are entered in separate Lower, Medium, and Upper class lists; each anchor keeps the class of its list, while unanchored families use the configured class percentages. An optional population limit distributes the requested people as evenly as possible across families, with each family receiving at least one member and never exceeding its balanced target.

Completed registries are saved in browser storage with their seed, settings, generated family data, and selected output format. The history panel can reopen or delete each saved registry independently.

When enabled, the Civil Registry backer option reads an optional sixth anchor field after the roll/profession and adds `###### (Backer's Name: ...)` beneath that family's numbered heading. Missing backer names are ignored without validation errors. The output can start at a user-selected positive family number; numbering remains continuous from that starting value.

## 9. Seeded generation and validation

Generation must accept an explicit seed. The same rule-set version, data set, and seed must reproduce the same family. Validation must detect at least:

- impossible ages for a race;
- parent/child ages that contradict the configured rules;
- missing or duplicate NPC IDs;
- duplicate names where uniqueness is required;
- relationships pointing to missing members;
- spouse/partner or widowhood contradictions;
- children generated from a non-breedable or unsupported pairing;
- family sizes exceeding configured limits.

## 10. Deferred scope

These are intentionally after the standalone MVP:

- editable in-app rule/data editor;
- Foundry VTT or another D&D-platform integration;
- desktop packaging;
- AI-generated prose or portraits;
- online synchronization.

## 11. Open decisions to record during implementation

- Whether locked fields include only values or also relationships and generated history.
- Whether regenerating one NPC may change dependent children or relatives, or must freeze all existing dependents.
- Exact interpretation of twin and triple chances (`2` and `0.1` in the source).
- Exact interpretation of the `Combination` race weight.
- Whether “core death” means the anchor is deceased, absent, or replaced by a surviving household member.
- Whether servants and roommates share the family surname or always keep their own surnames.
- Whether the initial Young Adult profession list should be expanded or replaced with a user-curated list.
- Which export formats are required for the first public version.
