# NPC Family Maker — Production Plan

## Product direction

Build a standalone, local-first application with a reusable generation engine, a browser interface, batch generation, custom output templates, and optional D&D-platform integration.

The generator logic should be separate from the user interface so the same engine can later support a browser app, desktop app, or Foundry VTT module.

## Phase 0 — Product definition

Define the minimum viable product and the rules that version 1 must support.

### Deliverables

- `PROJECT_SPEC.md`
- Supported races, professions, relationships, and family types
- Definition of a designed or anchor NPC
- Example desired outputs
- Rules marked as intentional, uncertain, or broken

### Decisions to make

- Can an NPC have locked attributes?
- Can one family member be regenerated without changing the rest?
- How should mixed-race families work?
- Which output formats are required?
- Which existing spreadsheet behaviors must remain unchanged?

## Phase 1 — Extract the spreadsheet

Use the current Google Sheet as the source of rules and data.

### Tasks

- Document every sheet and important range
- Extract names, races, professions, relationships, and probability tables
- Identify named functions such as `ROLL` and `RANDPICK`
- Document family, spouse, child, elder, sibling, roommate, and servant generation
- Capture representative generated families as reference tests

Do not translate every formula cell-for-cell. Reconstruct the spreadsheet’s behavior as clean, testable application logic.

## Phase 2 — Build the data model

Replace scattered spreadsheet cells with structured objects.

### Core entities

```text
Family
 ├─ members[]
 ├─ surname
 ├─ householdType
 ├─ socialClass
 ├─ location
 └─ secrets[]

NPC
 ├─ id
 ├─ name
 ├─ race
 ├─ age
 ├─ gender
 ├─ profession
 ├─ relationships[]
 ├─ traits[]
 └─ lockedFields[]
```

### Requirements

- Unique IDs
- Seeded random generation
- Versioned rule sets
- Family relationships represented as a graph
- Clear distinction between generated, edited, and locked values

## Phase 3 — Create the generation engine

Build the core generator independently from the interface.

### It should support

- Seeded, reproducible randomness
- Weighted races, professions, and family types
- Age and relationship constraints
- Widowhood and death rules
- Mixed-race logic
- Children, siblings, grandparents, servants, and roommates
- Validation of impossible or contradictory results
- Designed NPCs as generation anchors

### Example

> A 62-year-old human widower and retired blacksmith is supplied as the anchor. The engine creates children, parents, siblings, household members, and history around him without changing his locked details.

This engine must be testable without the user interface.

## Phase 4 — Build the single-family interface

Create the first useful user-facing workflow.

### Interface features

- Design or select an anchor NPC
- Choose family size and social class
- Set required or forbidden traits
- Lock individual fields
- Generate a family
- Regenerate one member or one attribute
- Manually edit generated values
- Display the family as a tree
- Display individual NPC cards

## Phase 5 — Add custom outputs

Keep output formatting separate from generation logic.

### Initial output formats

- Family summary
- Individual NPC cards
- Markdown
- HTML
- PDF
- CSV
- JSON

### Template system

Allow user-created templates with placeholders and conditional sections.

```text
{{npc.name}}
{{npc.race}}
{{npc.age}}
{{npc.profession}}
{{family.surname}}
{{family.secrets}}
```

The same generated family should be usable with multiple output designs.

## Phase 6 — Add batch generation

Support generation of many families in one operation.

### Batch features

- Generate 10, 100, or 10,000 families
- Seeded reproducibility
- Progress indicator
- Pause and cancel support
- Duplicate detection
- Validation error report
- Export one file per family or one combined file
- Preview a sample before generating the complete batch

Performance tests should be written for large batches.

## Phase 7 — Add editable world data

Create an in-app editor so new content can be added without changing code.

### Editable data

- Races
- Names
- Professions
- Social classes
- Age ranges
- Relationship rules
- Probability tables
- Traits
- Regional naming conventions
- Special population rules

Data should be importable and exportable, preferably as JSON or CSV.

## Phase 8 — Integrate with the D&D platform

Keep platform integration after the standalone engine is stable.

Start with reliable exports. If Foundry VTT is the target platform, add a custom module that creates or updates Actors from generated NPC data. Foundry supports custom modules and extensions through its API: <https://foundryvtt.com/api/>

The standalone generator should remain usable even when the D&D platform is unavailable.

## Phase 9 — Package and release

Possible final forms:

- Browser application
- Installable desktop application
- Foundry VTT module
- A combination of all three using the same generation engine

A Tauri wrapper can package a web interface as a cross-platform desktop application: <https://v2.tauri.app/>

For a quick Python prototype, Streamlit can provide interactive forms and data-app behavior: <https://docs.streamlit.io/>

## Recommended technical direction

Use TypeScript for the long-term version:

- Shared generator engine
- Modern browser interface
- Strong data validation
- Reusable output renderers
- Future Tauri desktop packaging
- Easier path to Foundry integration

Use Streamlit only if the priority is proving the generator quickly before investing in a polished interface.

## AI-agent development workflow

Use one primary coding agent in controlled stages:

1. Inspect and document
2. Propose a design
3. Implement one phase
4. Run automated tests
5. Review the changes
6. Wait for approval before the next major phase

Do not let the agent make large architectural changes and feature changes in the same step.

## Project documentation files

Maintain these files throughout development:

```text
PROJECT_SPEC.md
WORKBOOK_MAP.md
RULES.md
DATA_SCHEMA.md
TEST_CASES.md
DECISIONS.md
CHANGELOG.md
```

These files preserve project context when moving between the web and desktop versions.

## Milestones

### MVP

Phases 0–6:

- Reproduce the important generator behavior
- Design an anchor NPC
- Generate a family around that NPC
- Regenerate selected fields
- Generate batches
- Export custom outputs

### Customizable version

Phase 7:

- Edit races, names, professions, rules, traits, and probabilities in the app

### D&D integration

Phase 8:

- Export or create NPCs in the chosen D&D platform

### Polished release

Phase 9:

- Testing, packaging, backups, documentation, and distribution

## First implementation task

Create `PROJECT_SPEC.md` and `WORKBOOK_MAP.md` from the existing New Population Maker sheet. Record the current rules, data sources, sample outputs, and unresolved behaviors before writing the new generation engine.
