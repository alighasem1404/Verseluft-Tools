# Civil Registry Maker — implementation handoff

This document describes the implemented behavior of Civil Registry Maker in Verseluft Tools. It is written so another AI can reproduce or port the feature. The registry feature is a coordinator and exporter around the existing NPC Family Maker engine; it does not independently implement household biology, names, jobs, or relationship generation.

## Goal and user experience

Generate one deterministic, town-scale registry containing multiple complete households. Users can either provide named NPC anchors or provide only household backers. They can set social-class distributions, race weighting, household type, optional population, numbering, and export format. Generated results can be copied, downloaded, and reopened from local browser history.

The UI is a three-step wizard:

1. **Inputs:** seed, mode, family count (anchor mode), numbering start, optional population limit, anchor/backer lists by class, and optional anchor backer display.
2. **Distribution:** lower/medium/upper class percentages, family type, race weights, export format, second-wife option, and elder option.
3. **Registry:** output text, summary counts, copy/download controls, and saved-history entries.

Changing the export format after generation re-renders the same generated registry. It must not regenerate families.

## Modes and input formats

### Anchor NPC families (default)

- User supplies a positive whole-number family count.
- There may be zero to `familyCount` anchors. More anchors than families is invalid.
- Three separate multiline inputs represent Lower, Medium, and Upper class. Anchors in each input retain that class and are placed in registry order: all Lower anchors, then Medium, then Upper. Remaining unanchored families are assigned class using configured percentages.
- Each nonblank line is CSV: `name, sex, race, age, roll[, backer name]`.
- First row may be a header when its first cell, case-insensitively, is `name`.
- CSV parser supports quoted cells and escaped quote characters (`""`). Commas inside quoted cells are retained. Cells are trimmed.
- At least five fields are required. The first five are name, sex, race, age, profession/roll. All trailing cells after the fifth are joined with `, ` as the optional backer name.
- Sex accepts `Male`/`M`, `Female`/`F`, `Non-binary`/`Nonbinary`/`Non binary`/`NB`, case-insensitively.
- Race accepts a case-insensitive supported race name. `Elf` is accepted as the Elf template race; generated members may use Elf subraces according to the shared engine rules. The family engine's race registry is authoritative.
- Age must parse to a finite number >= 0. It is not prevalidated against race maximum in the registry parser; family validation reports race-specific over-age issues.
- Name is split on whitespace. First token is first name; remaining tokens are surname. A one-token name is used as both first name and surname. Blank names fall back to `Unnamed` for both.
- Profession/roll may be empty. An absent backer name is ignored without an error.
- Invalid fields produce line-numbered errors. The parser still creates a fallback anchor internally, but registry generation aborts on any parse error; invalid fallback values are not used in a successful registry.
- For a valid anchor, the anchor is the core household member. Its first name, race, age, gender, and profession are locked against rerolling by the family engine. Its surname supplies the household surname. Its class is the input list's class.
- Anchor relationship role depends on generated/selected family type: Single and Roommate use the anchor's gender label; Sibling uses Brother for Male and Sister otherwise; other types use Husband for Male, Wife for Female, and Spouse for Non-binary.
- Anchors are matched by their class-grouped input order to family indices from 1 onward. Anchors do not reserve a randomly selected family slot.

### Backer-only families

- Each nonblank line in one of three class inputs is one backer name; no CSV parsing is used.
- A first-line header equal to `name`, `backer`, `backer name`, or `backer names` is skipped, case-insensitively.
- Each backer creates exactly one family; family count is the total number of backer lines. The family-count control is hidden/ignored. At least one backer is required.
- Backers retain the class of their input list and are ordered Lower, then Medium, then Upper.
- Each generated family still gets a generated core member and any eligible generated relatives/household members. Backer-only means no provided anchor NPC data, not an empty family.
- Backer name is always attached to its family and printed in output. The anchor-mode “include backer names” checkbox is hidden and not used.

## Defaults and settings

- Seed: a generated `town-...` value on initial page load, on reset, and from the “New seed” action. If the seed input is blank when generating, create and store a new seed. Explicit seed text is trimmed.
- Default mode: anchors.
- Default family count: 20.
- Default starting family number: 1; must be a positive integer.
- Population: optional. When present it must be an integer >= family count (or >= backer count in backer mode), ensuring at least one member per family.
- Class percentages default to Lower 40%, Medium 40%, Upper 20%. Each value must be finite and nonnegative; sum must equal 100 within tolerance 0.001. Percentage validation also runs in backer mode although class is fixed for every family there.
- Default family type selection is random using NPC Family Maker's weighted family type list. Explicit types are passed through to that engine. Current types include Single, Roommate, Sibling, Gay, and Normal.
- Race weight mode: default weights; custom weights; or a single selected race. Default means no override passed to the family engine. Custom values are relative weights, not percentages; zero excludes a race, negative or non-finite values fail, and at least one weight must be positive. Single race passes that race with weight 1. Anchor race remains fixed regardless of weights. Family engine race names are authoritative.
- “Allow random second-wife chance” is checked by default; applies only to eligible Normal households, with the shared engine's 40% chance. It is suppressed if widowhood or target-size constraints prevent it.
- “Include elders when eligible” is checked by default; false disables probabilistic grandparents in the shared engine.
- “Include backer names” is unchecked by default in anchor mode. If enabled, an anchor's optional sixth field is attached and printed. Missing names remain absent.
- Default output: Homebrewery paging. Other formats: numbered Markdown and plain family blocks.
- Reset restores all defaults, clears current generated output and counts, clears anchor/backer inputs and current registry, returns to step 1, and creates a fresh seed. It does not erase saved history.

## Validation and errors

Generation fails with a visible error message and does not save a new history item if any of the following apply:

- starting family number is not a positive integer;
- a class percentage is invalid or the total differs from 100 by more than 0.001;
- anchor mode family count is not a positive integer;
- backer-only mode contains no backer names;
- population is not a whole number or smaller than number of families;
- any anchor row has fewer than five cells, unsupported sex/race, or invalid/negative age;
- anchor count exceeds family count;
- race-weight overrides contain unsupported races, invalid/negative values, or all zero weights.

Family-level validation is produced by NPC Family Maker and attached to each household in `validationIssues`. Civil Registry does not block on these issues. Registry Markdown and summary counters currently do not display them.

## Determinism and generation algorithm

Use seeded generation so identical inputs, engine/data versions, and seed reproduce the same registry.

1. Resolve mode and parse grouped anchors or backers.
2. Set family count: requested count in anchor mode; number of names in backer mode.
3. If population is supplied, balance it across all family indices using `base = floor(population / familyCount)` and distribute the remainder one each to earliest indices. Example: 10 people / 4 families -> `[3, 3, 2, 2]`.
4. Create a registry-level RNG from the registry seed. It is used to weighted-pick household class for each family without a supplied anchor/backer class.
5. For family index `i` (zero-based), derive seed `${seed}:family-${i+1}`. Derive a separate type RNG from `${familySeed}:type`; choose explicit family type when configured, otherwise weighted-pick from NPC Family Maker types. This keeps family-type assignment stable and independent per index.
6. The anchor/backer at the same index, if any, fixes the household class. Otherwise weighted-pick class from Lower/Medium/Upper configured percentages using the registry RNG.
7. Invoke `NpcFamilyMakerEngine.buildFamily` with: derived family seed, selected type/class, second-wife and elder flags, `ignoreFamilyMemberLimit: true`, balanced `targetMemberCount` if population supplied, race-weight override if present, anchor or backer name if present.
8. In anchor mode, attach the anchor record with calculated `relationshipRole` and locked fields `firstName`, `race`, `age`, `gender`, `profession`. In backer mode, no anchor is passed.
9. Registry population is calculated as the sum of generated member counts (with population targeting, expected to equal population).
10. Registry ID is `registry-${seed}`. Registry stores seed, mode, counts, starting number, normalized class percentages, population limit, anchor/backer counts, families, population, and an empty top-level errors array.

The family engine receives `ignoreFamilyMemberLimit: true` in both modes, so its usual maximum household-member limit is not enforced for registry generation. If an explicit population target is present, it controls exact household size and family generation fills/truncates to that count using family-type-specific member logic. Without a population target, household sizes follow the shared NPC Family Maker generation rules and may exceed its normal default cap.

### Dependency contract: NPC Family Maker

Include the existing data and engine or implement an equivalent service. Civil Registry relies on:

- `RACES`, `RACE_WEIGHTS`, `FAMILY_TYPES` and `resolveRaceName` for valid input and controls;
- `createRng(seed)` with deterministic `next`, `int`, `pick`, and `weighted` methods;
- `buildFamily(options)` returning a household with at least `surname`, `familyType`, `householdClass`, `members`, `relationships`, `validationIssues`, and optional `backerName`;
- honoring `seed`, `familyType`, `householdClass`, `anchor`, `backerName`, `raceWeights`, `allowSecondWifeChance`, `includeElders`, `targetMemberCount`, and `ignoreFamilyMemberLimit`;
- family members with `firstName`, `race`, `age`, `relationshipRole`, optional `profession`.

Household composition (partners, children, siblings, elders, roommates, servants), race inheritance, ages, naming, professions, family-type weighting, and family validation belong to NPC Family Maker, not the registry coordinator. To reproduce exact current output, carry across its matching workbook data (`Data/npc-family-maker-data.js`) and engine (`npc-family-maker-engine.js`) version as well as this registry logic.

## Output formatting

### Plain family blocks

For each family in order:

```text
The "{surname}" Family

###### (Backer's Name: {backerName})

- {firstName}, {race}, {age}, {relationshipRole}[, {profession}]
...
```

The backer heading and its surrounding blank line(s) only appear when the family has a backer name. Separate families by one blank line. Profession is omitted when empty. No family type, class, or family number is included.

### Numbered Markdown

Same member lines and optional backer line, but heading is `###### {number} The {surname} Family`. Numbering begins at `startingNumber` and increments continuously, regardless of page divisions.

### Homebrewery Markdown (default)

- Format each numbered family as an indivisible block; never split a family across pages.
- For line-cost estimation, split block text on newline, ignore empty lines, and count each non-empty line as one; lines longer than 60 characters count as two (not proportional wrapping).
- Page capacity is 260 calculated lines.
- Before adding a family, if current page is nonempty and `usedLines + familyCost >= 260`, close page and start a new one. Thus page cost stays strictly below 260 except an oversized single family, which stays intact on its own page.
- Wrap each page in `{{index,wide,columns:3`, blank line, family blocks separated by blank lines, blank line, `}}`, then blank lines and `\page`. Current implementation appends a page break after every emitted page, including the final page.

## Browser history and actions

- Use localStorage key `civilRegistryMakerHistory`.
- On load, parse its JSON; only accept an array. Missing, malformed, or non-array storage becomes empty history.
- After successful generation, prepend `{id: "${timestamp}-${seed}", createdAt: ISO timestamp, seed, familyCount, format, options, registry}` and persist the whole array. Storage write errors (e.g. quota) are silently ignored.
- History list displays seed, family count, and localized creation timestamp; each item has Open and Delete.
- Open restores the saved registry object and saved format (legacy missing format defaults to Homebrewery), renders and moves to step 3. It does not regenerate from options.
- Delete removes just that history entry and persists.
- Copy writes current output to clipboard, falling back to selection + `document.execCommand('copy')`.
- Download current output as a `text/markdown` blob named `${seed}-civil-registry.md`.
- Summary counters display family count, anchor count or backer count depending on mode, and total member count.

## Suggested porting architecture

Keep these layers separate:

1. **Input parsing/validation:** CSV anchors, class grouping, backer lines, percentages, numeric constraints.
2. **Registry coordinator:** mode, deterministic index ordering/seeds, class assignment, population distribution, calls to household generator, registry result object.
3. **Household generator adapter:** use NPC Family Maker unchanged where possible.
4. **Renderers:** plain Markdown, numbered Markdown, Homebrewery pagination; renderer selection must not alter generated data.
5. **UI/history adapter:** wizard state, summary, error display, local persistence, copy/download.

## Source of truth

Current implementation is in `civil-registry-maker-engine.js` and the inline script in `civil-registry-maker.html`. The household dependency is `npc-family-maker-engine.js` plus `Data/npc-family-maker-data.js`. Regression expectations are in `tests/civil-registry-maker-engine.test.js`. The project overview also has the short description in `PROJECT_SPEC.md`, section 8.1.
