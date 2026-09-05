# New Population Maker — Workbook Map

**Source:** [New Population Maker](https://docs.google.com/spreadsheets/d/1a1uwaHb9CV79BqAfdthtR3OxjS-uLvY8lSOsptHjsTo/edit)  
**Spreadsheet ID:** `1a1uwaHb9CV79BqAfdthtR3OxjS-uLvY8lSOsptHjsTo`  
**Locale:** `en_US`  
**Time zone:** `Asia/Tehran`  
**Inspected:** 2026-09-01

This document maps the current spreadsheet so the application can reproduce its behavior without becoming dependent on spreadsheet cell layout.

## Workbook structure

| Tab | Sheet ID | Grid size | Role |
|---|---:|---:|---|
| Main sheet | 0 | 1001 × 27 | Global controls and weights |
| Family Creation | 1345298773 | 1502 × 291 | Main family generation output and intermediate columns |
| Data | 1445990615 | 1000 × 27 | Relationship, aging, race, family-type, and offspring data |
| Single Family Generator | 1270882970 | 1000 × 26 | Currently empty in inspected range |
| Index Generator | 1761556616 | 1000 × 26 | Currently empty in inspected range |
| Name Data | 1414178819 | 1001 × 29 | Race/gender first names and surnames |
| Dirty Backstage | 1104396212 | 1001 × 121 | Helper/staging calculations used by generated output |
| Profession Data | 1848275379 | 1000 × 26 | Job titles and descriptions |
| New Profession Data | 1036211063 | 1006 × 26 | Class-specific profession pools and demand levels |
| Sheet8 | 825624974 | 1006 × 116 | Alternate/expanded profession table |

## Main sheet

### Global generation controls

Primary control labels are in `A2:Q5`:

- `C3` maximum family member setting: 10
- `D3` widow chance: 15
- `E3` core death chance: 50
- `F3` paternal-side elder accompaniment: 20
- `G3` maternal-side elder accompaniment: 20
- `H3` gay chance: 5
- `I3` mixed-race chance: 20
- `J3` non-breedable chance: 40
- `K3` twin setting: 2
- `L3` triple setting: 0.1
- `M3` maximum roommate number: 5
- `N3` maximum sibling number: 5
- `O3` sibling-in-family setting: 10
- `P3` elderly-in-family setting: 15
- `K5` middle-class servant chance: 60
- `M5` unemployment chance: 15

### Family type weights

Labels are in `C4:G4`; values are in `C5:G5`:

| Cell | Type | Value |
|---|---|---:|
| C5 | Single | 5 |
| D5 | Roommate | 5 |
| E5 | Sibling | 5 |
| F5 | Gay | 5 |
| G5 | Normal | 80 |

### Race controls

Labels are in `A6:J6`; values are in `A7:J7`:

| Race/branch | Value |
|---|---:|
| Human | 30 |
| Elf | 15 |
| Half-elf | 25 |
| Half-orc | 5 |
| Dwarf | 5 |
| Halfling | 5 |
| Gnome | 5 |
| Dragonborn | 5 |
| Tiefling | 5 |
| Combination | 100 |

Demand-level ratios appear in `E18:G20`: High 80, Middle 15, Low 5.

## Family Creation

The main generated table starts at row 3. `A3` uses `=SEQUENCE(100)`, so the intended sample/output region is 100 generated families beginning at row 3.

Rows 1–2 are grouped headers. The sheet has one wide row per family, with display text in columns `B:C` and detailed generation columns to the right.

### Family-level columns

| Range | Meaning |
|---|---|
| A | Sequential family number |
| B | Formatted family/household summary |
| C | Compact generated NPC list |
| D | Household class; current sample is `Medium` |
| E | Family type |
| F | Family mix flag |
| G | Family breeding flag |
| H | Sibling-in-family flag |
| I | Widow flag |
| J | Core-death flag |
| K | Family surname |

### Member blocks

| Block | Start column | Header range | Notes |
|---|---|---|---|
| Core member | L | `L2:U2` | Surname, combined text, race, name, age, gender, max child, relationship, job roll, job |
| Spouse | V | `V2:AE2` | Same general fields as core; source may return `FALSE` when absent |
| Child 1 | AH | `AH2:AP2` | Combined, job combo, race, name, age, gender, job roll, job, relationship |
| Child 2 | AQ | `AQ2:AY2` | Same child block |
| Child 3 | AZ | `AZ2:BH2` | Same child block |
| Child 4 | BI | `BI2:BQ2` | Same child block |
| Child 5 | BR | `BR2:BZ2` | Same child block |
| Child 6 | CA | `CA2:CI2` | Same child block |
| Child 7 | CJ | `CJ2:CR2` | Same child block |
| Child 8 | CS | `CS2:DA2` | Same child block |
| Child 9 | DB | `DB2:DJ2` | Same child block |
| Child 10 | DK | `DK2:DS2` | Same child block |
| Roommate 1 | DT | `DT2:EA2` | Combined, surname, race, name, age, job roll, job, gender |
| Roommate 2 | EB | `EB2:EI2` | Same roommate block |
| Roommate 3 | EJ | `EJ2:EQ2` | Same roommate block |
| Roommate 4 | ER | `ER2:EY2` | Same roommate block |
| Roommate 5 | EZ | `EZ2:FG2` | Same roommate block |
| Grandfather 1 | FH | `FH2:FQ2` | Chance, race, name/surname, age, gender, job, relationship |
| Grandmother 1 | FR | `FR2:GA2` | Same elder block |
| Grandfather 2 | GB | `GB2:GL2` | Same elder block with separate chance field |
| Grandmother 2 | GM | `GM2:GV2` | Same elder block with separate chance field |
| Sibling 1 | GW | `GW2:HE2` | Race, name, age, gender, job, relationship |
| Sibling 2 | HF | `HF2:HN2` | Same sibling block |
| Sibling 3 | HO | `HO2:HW2` | Same sibling block |
| Sibling 4 | HX | `HX2:IF2` | Same sibling block |
| Sibling 5 | IG | `IG2:IO2` | Same sibling block |
| Servant 1 | IP | `IP2:IV2` | Surname, race, name, age, gender |
| Servant 2 | IV | `IV2:JB2` | Same servant block |
| Servant 3 | JB | `JB2:JH2` | Same servant block |
| Servant 4 | JH | `JH2:JN2` | Same servant block |
| Servant 5 | JN | `JN2:JT2` | Same servant block |
| Servant 6 | JT | `JT2:JZ2` | Same servant block |
| Servant 7 | JZ | `JZ2:KA2` | Same servant block |

The current spreadsheet sometimes fills unused child or helper cells with `#DIV/0!`, rather than an explicit empty value. The application should use `null`/empty structured values and surface a validation issue only when the missing value affects a required member.

### Representative generated families

The inspected sample includes:

- `Leafgrove`: Normal Elf family with spouse, four children, and paternal elders.
- `Nightfury`: Normal mixed Tiefling/Gnome family with one child, mixed elders, and servants.
- `Goldleaf`: Normal Human family with spouse, five children, both paternal and maternal elders, and siblings.
- `Bronzeblade`: Gay family example.
- `Coldclaw`: Sibling-family example with mixed-race children and servants.
- `Roommate`: Roommate household example with unrelated residents.

## Data

### Relationship labels

`B2:B10` contains:

`Grandfather`, `Grandmother`, `Daughter`, `Son`, `Sister`, `Brother`, `Wife`, `Hasband`, `Roomate`.

The last two labels are source typos and should be normalized in application code.

### Aging data

The race aging table occupies `D2:L6`:

- row 3: maximum age;
- row 4: adulthood;
- row 5: mean age;
- row 6: young adulthood.

The source uses different life spans per race, including Human 100, Elf 750, Half-elf 180, Half-orc 75, Dwarf 350, Halfling 150, Gnome 400, Dragonborn 80, and Tiefling 120 for maximum age.

### Gender and age distributions

- `N2:N3`: Female and Male.
- `P2:P12`: age-distribution weights from 1 through 100.
- `Q2:R12`: race names and race chances, with Combination at 100.
- `S2:T12`: age values and maximum-child values used by the source helper logic.

### Family type and class

- `C10:E16`: family type weight table.
- `Q16:Q19`: family class labels Upper, Medium, Lower.
- `C21:C29` and `G10:O29`: breeding/non-breeding race compatibility helpers.

### Offspring race tables

- Offspring rule set 1: `C35:L44`.
- Offspring rule set 2: `C47:L56`.

Rows identify parent race 1 and columns identify parent race 2. A dash indicates no supported result in the current table. The two rule sets are not identical and must remain versioned in the application data.

## Name Data

The header row `A1:AB1` contains race/gender pools:

- Male/Female/Surnames for Dragonborn, Dwarf, Elf, Gnome, Half-Elf, Halfling, Half-Orc, Human, and Tiefling.

Rows 3–302 are the primary name data area. Row 2 contains range formulas pointing back to those pools. Column `AC` contains additional stray/generated values and should not be treated as a primary name pool until its purpose is confirmed.

## Profession Data

### Profession Data

`A:C` contains numbered job titles and descriptions, beginning with Alchemist, Baker, Banker, Beggar, Bowyer, Brewer, Butcher, Calligrapher, Candlemaker, Carpenter, and continuing through the broader occupation list.

### New Profession Data

This tab is the more relevant source for generation:

- `A:B`: lower-class jobs and demand level;
- `D:F`: lower-class high/medium/low-demand pools;
- `H:I`: middle-class jobs and demand level;
- `K:M`: middle-class high/medium/low-demand pools;
- `O:P`: upper-class jobs and demand level;
- `R:T`: upper-class high/medium/low-demand pools;
- `Y:Y`: job descriptions.

The source contains spelling variants such as `Candel Maker`, `Candelmaker`, `Apprantice`, `Assistante`, and `low deman`. The engine should normalize display labels while keeping the source data traceable.

### Sheet8

`A:B` provides another lower-class job list and demand level; `H:I` and `M` continue alternate middle-class data. It appears to be an alternate or expanded profession source and should not become authoritative until compared against `New Profession Data`.

## Formula and helper behavior

Observed formulas use these spreadsheet functions or named functions:

- `ROLL()` — named random-roll helper used for weighted decisions and chance checks;
- `RANDPICK()` — named random-choice helper used for names and surnames;
- `SEQUENCE()` — creates the generated family-number series;
- `VLOOKUP()` — resolves family types from cumulative weights;
- `XLOOKUP()` and `INDIRECT()` — resolve name-pool ranges;
- `TEXTJOIN()` and `CHAR()` — assemble the family and NPC display text;
- `IFS()` and `IF()` — branch by family type and optional members.

The application should replace these with explicit seeded random utilities, weighted-choice functions, and structured renderers. `ROLL` and `RANDPICK` definitions must be reconstructed from observed behavior because named-function definitions are not part of the visible cell data.

## Empty or staging tabs

- `Single Family Generator` was empty in the inspected `A1:Z100` range.
- `Index Generator` was empty in the inspected `A1:Z60` range.
- `Dirty Backstage` is a staging area rather than a user-facing source and contains many helper results, including visible `#DIV/0!` values.

These tabs should not be treated as independent product requirements until their intended future use is confirmed.

## Known problems to preserve as explicit migration notes

1. Many unused child slots and helper cells return `#DIV/0!` instead of empty values.
2. The source has inconsistent spellings and casing for relationship, profession, demand, and breeding labels.
3. Some generated rows contain `FALSE` in place of an absent spouse, job, or member.
4. Display strings and structured fields are mixed together, so the same member can appear in different field orders in different outputs.
5. The race controls include a separate `Combination` branch whose probability semantics are unclear.
6. Twin and triple settings are stored as `2` and `0.1`, but the exact probability interpretation is unclear.
7. The relationship graph is implied by text labels and block position rather than represented explicitly.
8. The empty `Single Family Generator` and `Index Generator` tabs do not yet provide a reliable implementation reference.

The local engine deliberately extends the workbook behavior in four documented ways: Single households may receive servants in Medium/Upper classes; the UI can enable a 40% second-wife/partner chance for Normal families only, with that partner's own parents and children; children receive professions only after reaching their race's young-adult threshold; and the sibling-count control creates explicit sibling members and relationships.

Migration rule: do not silently correct these behaviors in the first engine. Encode the intended normalized behavior, keep a compatibility note for each source issue, and add tests for every deliberate divergence.
