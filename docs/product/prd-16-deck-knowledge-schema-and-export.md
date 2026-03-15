# PRD 16 - Deck Knowledge Schema and Export

Source: `CHARTER.md` (v0.3) + `prd-06-data-model-and-api.md` execution detail
Coverage: canonical deck-knowledge schema, initialization rules, and export/import package

## 1) Purpose
This PRD is the canonical contract for the upcoming `knowledge` module, deck-management surface, and deck export/import baseline.

It resolves the previously-open question about:
- the concrete schema shape for card and symbol knowledge,
- how starter-content and empty-template decks are initialized,
- and what exactly must round-trip through deck export/import.

This document is meant to be detailed enough that the next implementation branches can share one model instead of inventing separate backend and frontend variants.

## 2) Scope
### 2.1 In scope
- user-owned deck instances,
- card and symbol identity records,
- card-symbol links,
- card and symbol knowledge entry shape,
- supporting source metadata,
- deck initialization modes,
- deck export/import package format,
- versioning rules needed to preserve deterministic readings.

### 2.2 Out of scope
- Reading Studio canvas mutation persistence.
- Interpretation prompt wording.
- Binary asset packaging.
- Public deck marketplace or moderation workflow.
- Merge-in-place import into an existing deck.

## 3) Core Design Decisions
### 3.1 Decks are user-owned instances
- A deck that can be edited, exported, imported, or chosen as a reading default is a user-owned deck instance.
- Starter content is an initialization source, not the steady-state storage model.
- The current seeded deck catalog may remain the bootstrap source for V1 migration, but onboarding should ultimately produce or select a user-owned deck instance.
- `user_preferences.defaultDeckId` should converge on a user-owned deck instance ID once the deck-knowledge domain is implemented.

### 3.2 Identity is separate from knowledge
- Card identity fields are not the same thing as card knowledge.
- Symbol identity fields are not the same thing as symbol knowledge.
- A card or symbol must not have one giant canonical `meaning` field.
- Knowledge lives in additive information entries that can be reordered, revised, sourced, and exported.

### 3.3 Stable portable identifiers
- Every card has a stable deck-scoped `cardId` string.
- Every symbol has a stable deck-scoped `symbolId` string.
- Those portable identifiers must be preserved in exports and reused on import.
- Readings continue to store the stable `cardId` values used for deterministic assignment, not transient internal row IDs.

Reference rule:
- Export payloads and cross-record references use portable identifiers (`cardId`, `symbolId`, `entryId`, `sourceId`).
- Persistence may additionally keep internal UUID foreign keys for relational integrity, but those internal IDs are not part of the portable deck contract.

### 3.4 Deck versioning is split in two
- `deckSpecVersion` tracks only the deterministic roster contract.
- `knowledgeVersion` tracks changes to the deck's knowledge graph.

`deckSpecVersion` must change only when the ordered card roster used by deterministic shuffle changes, for example:
- card added or removed,
- card order changed,
- `cardId` changed.

`knowledgeVersion` must increment whenever any of the following changes:
- card display metadata,
- symbol display metadata,
- card-symbol links,
- card information entries,
- symbol information entries,
- knowledge sources.

Card and symbol knowledge edits must not force a `deckSpecVersion` change, because they do not alter deterministic card assignment.

### 3.5 Import is clone-only in V1
- `POST /v1/decks/import` creates a new deck owned by the importer.
- V1 import does not merge into an existing deck.
- The imported copy gets new internal database IDs but preserves portable deck content identifiers (`cardId`, `symbolId`, entry IDs, source IDs).

### 3.6 V1 UX defaults are part of the contract
These product decisions are locked for the first implementation wave and must not be re-decided independently in backend and frontend branches:
- Choosing the built-in starter deck during onboarding creates an immediately editable user-owned deck instance, not a long-lived reference to a shared template row.
- Starter-content decks should feel substantial on day one; while curated production content is pending, mock entries, symbols, links, sources, and image references are acceptable.
- The deck-management experience is deck-library-first: symbols are independently browsable, cards show linked symbols, and symbols show linked cards.
- Knowledge is authored as layered ordered entries rather than one canonical card or symbol “meaning” blob.
- The first-party V1 editor only needs to expose `plain_text` and `markdown`; `json` remains available for import/internal advanced cases.
- Sources are minimal but visible in V1: users can see attached sources and perform lightweight source management without a separate source-management workspace.
- V1 deck import/export should be exposed through basic UI controls, not a full package-management workflow.
- Deck and card images are displayable in V1 but not user-editable yet.

## 4) Canonical Deck Model
### 4.1 Deck
A deck instance represents one user-owned symbolic system.

Required deck fields:
- `id`: internal UUID, used as the primary API identifier for the deck instance.
- `ownerUserId`: owning Tarology user.
- `name`: user-facing deck name.
- `description`: optional long-form description.
- `deckSpecVersion`: string version for the deterministic roster contract.
- `knowledgeVersion`: monotonic integer for the mutable deck knowledge graph.
- `initializationMode`: `starter_content` | `empty_template` | `imported_clone`.
- `initializerKey`: nullable string identifying the starter-content bundle or empty-template preset used to create the deck.
- `originExportDigest`: nullable string set only for imported decks.
- `previewImageUrl`: optional preview image.
- `backImageUrl`: optional shared card back image.
- `createdAt`
- `updatedAt`

Derived or cached deck fields:
- `cardCount`
- `symbolCount`

Important rules:
- A deck always owns its current cards, symbols, links, and knowledge entries.
- Readings reference the deck instance used at creation time through `deckId`.
- A deck may be archived later, but V1 does not need separate deck lifecycle states beyond normal ownership and availability checks.

### 4.2 Card
Cards are deck-scoped identity records plus optional display metadata.

Required card fields:
- `id`: internal UUID, used by row-oriented APIs.
- `deckId`
- `cardId`: stable string, unique within the deck and preserved in exports.
- `name`
- `sortOrder`: integer used as the deterministic roster order for shuffle input.
- `createdAt`
- `updatedAt`

Optional card metadata:
- `shortLabel`
- `faceImageUrl`
- `metadataJson`
  Suggested uses:
  - suit,
  - arcana,
  - rank,
  - display hints,
  - future non-binding presentation metadata.

Important rules:
- `sortOrder` and `cardId` together define the deterministic roster contract for `deckSpecVersion`.
- Knowledge does not live in the card record itself; it lives in card information entries.

### 4.3 Symbol
Symbols are deck-scoped first-class records, not embedded text fragments under a card.

Required symbol fields:
- `id`: internal UUID.
- `deckId`
- `symbolId`: stable string, unique within the deck and preserved in exports.
- `name`
- `createdAt`
- `updatedAt`

Optional symbol metadata:
- `shortLabel`
- `description`
- `metadataJson`

Important rules:
- A symbol may exist without being linked to any card.
- A symbol may be linked to many cards within the same deck.

### 4.4 Card-Symbol Link
Card-symbol links express that a symbol is present or relevant on a specific card.

Required link fields:
- `id`: internal UUID or stable composite key.
- `deckId`
- `cardId`
- `symbolId`

Optional link fields:
- `sortOrder`
- `placementHintJson`
  Suggested uses:
  - rough visual region,
  - layering,
  - future image-map coordinates.
- `linkNote`

Important rules:
- Links are deck-scoped.
- Links must not cross deck boundaries.
- Removing a symbol should remove or archive its links.

## 5) Knowledge Entry Schema
### 5.1 Shared entry shape
Card and symbol knowledge entries share one contract shape even if they are stored in separate tables.

The shared domain fields are:
- `id`: internal UUID.
- `entryId`: stable string preserved in exports and unique within the parent subject.
- `label`: short user-facing title such as `core-theme` or `reversed-notes`.
- `format`: `plain_text` | `markdown` | `json`.
- `bodyText`: nullable text field used for `plain_text` and `markdown`.
- `bodyJson`: nullable JSON field used for structured content.
- `summary`: nullable one-line summary for list views and previews.
- `tags`: nullable array of short strings.
- `sourceIds`: ordered array of portable source IDs referenced by the entry.
- `sortOrder`: integer for display and export stability.
- `archivedAt`: nullable soft-delete marker.
- `createdAt`
- `updatedAt`

Parent reference rules:
- card information entries belong to one card and reference that card's portable `cardId` in exports,
- symbol information entries belong to one symbol and reference that symbol's portable `symbolId` in exports,
- persistence may store those relationships through internal UUID foreign keys.

Important rules:
- An entry uses either `bodyText` or `bodyJson`; it must not require both.
- `label` is not a fixed enum in V1. Users and starter bundles may define their own labels.
- `sourceIds` may be empty for explicitly user-authored notes, but factual or contextual starter/imported content should cite one or more sources.
- An entry is the unit that the deck-management UI edits, reorders, and exports.

### 5.2 Card information entries
Card information entries belong to exactly one card.

Common examples:
- upright semantics,
- reversed semantics,
- symbolism notes,
- historical context,
- reader-authored reflections,
- spread-specific heuristics stored by the reader.

### 5.3 Symbol information entries
Symbol information entries belong to exactly one symbol.

Common examples:
- motif description,
- thematic associations,
- interpretive tensions,
- recurring narrative use,
- reader-authored notes.

### 5.4 Knowledge sources
Sources store citation and provenance metadata that knowledge entries point to.

Required source fields:
- `id`: internal UUID.
- `deckId`
- `sourceId`: stable string preserved in exports.
- `kind`: `reader_note` | `starter_content` | `imported_reference` | `manual_reference` | `external_enrichment`.
- `title`
- `capturedAt`

Optional source fields:
- `author`
- `publisher`
- `url`
- `citationText`
- `publishedAt`
- `rightsNote`
- `metadataJson`

Important rules:
- Source tiers are derived from `kind`, not manually chosen per request.
- V1 export/import must preserve all source metadata referenced by deck knowledge entries.
- `external_enrichment` is reserved for future reviewable enrichment flows; it is not part of the baseline interpretation contract.

## 6) Initialization Rules
### 6.1 `starter_content`
Starter-content initialization creates a deck with:
- the full deterministic card roster,
- any bundled symbol records,
- any bundled card-symbol links,
- bundled card and symbol information entries,
- bundled source metadata.

Additional rules:
- The starter-content bundle is identified by `initializerKey`.
- V1 may ship starter content from curated code-level manifests or seeded database content.
- Until production-quality deck knowledge is ready, starter-content bundles may use mock content.
- The built-in starter path used by onboarding should produce a personal deck instance that is immediately usable for readings, editing, and export.
- Starter-content decks should include image references where available so the deck-management surface can feel real even before image editing exists.

### 6.2 `empty_template`
Empty-template initialization creates a deck with:
- the full deterministic card roster,
- card display metadata required to function as a deck,
- no symbol rows,
- no card-symbol links,
- no card or symbol information entries,
- no starter-content sources.

Additional rules:
- An empty deck must still be usable for deterministic reading creation.
- Empty means “knowledge-empty,” not “missing cards.”

### 6.3 `imported_clone`
Imported-clone initialization creates a deck by validating and copying an export package.

Additional rules:
- Import creates a new owned deck instance.
- Portable identifiers are preserved.
- Internal UUIDs are regenerated.
- The imported deck stores `originExportDigest` and `initializationMode=imported_clone`.

## 7) Export Package Format
### 7.1 Envelope
V1 export format is a JSON document with this top-level shape:

```json
{
  "format": "tarology.deck.export",
  "version": 1,
  "exportedAt": "2026-03-15T12:00:00.000Z",
  "deck": {},
  "cards": [],
  "symbols": [],
  "cardSymbols": [],
  "knowledgeSources": [],
  "cardInformationEntries": [],
  "symbolInformationEntries": []
}
```

### 7.2 Deck payload
`deck` must include:
- `name`
- `description`
- `deckSpecVersion`
- `knowledgeVersion`
- `initializationMode`
- `initializerKey`
- `previewImageUrl`
- `backImageUrl`
- `cardCount`

Optional provenance fields:
- `originExportDigest`
- `exportNotes`

### 7.3 Card payload
Each card record must include:
- `cardId`
- `name`
- `sortOrder`

Optional fields:
- `shortLabel`
- `faceImageUrl`
- `metadataJson`

### 7.4 Symbol payload
Each symbol record must include:
- `symbolId`
- `name`

Optional fields:
- `shortLabel`
- `description`
- `metadataJson`

### 7.5 Card-symbol payload
Each link record must include:
- `cardId`
- `symbolId`

Optional fields:
- `sortOrder`
- `placementHintJson`
- `linkNote`

### 7.6 Knowledge entry payload
Each card or symbol entry must include:
- `entryId`
- parent portable identifier (`cardId` or `symbolId`)
- `label`
- `format`
- `summary`
- `sourceIds`
- `sortOrder`

And one of:
- `bodyText`
- `bodyJson`

### 7.7 Source payload
Each knowledge source must include:
- `sourceId`
- `kind`
- `title`
- `capturedAt`

Optional fields:
- `author`
- `publisher`
- `url`
- `citationText`
- `publishedAt`
- `rightsNote`
- `metadataJson`

### 7.8 What export does not include
Deck export must not include:
- readings,
- reading events,
- interpretations,
- provider connections,
- user profile data,
- session/auth data,
- analytics or stats,
- raw encrypted secrets.

### 7.9 Binary asset policy
V1 exports carry asset references only, not bundled binary media.

That means:
- `faceImageUrl`, `previewImageUrl`, and `backImageUrl` may be preserved as URLs or other future asset references,
- but the export package itself does not embed image files in V1.

## 8) Import Validation Rules
Before accepting a deck import, the server must validate:
- `format === "tarology.deck.export"`,
- `version === 1`,
- card `cardId` values are unique,
- symbol `symbolId` values are unique,
- every card-symbol link references an existing card and symbol,
- every knowledge entry references an existing card or symbol,
- every referenced `sourceId` exists in `knowledgeSources`,
- card `sortOrder` values form one deterministic roster,
- the imported deck is compatible with the currently supported V1 reading contract.

V1 compatibility rule:
- V1 hosted Tarology only guarantees import for decks whose deterministic reading contract is supported by the live product.
- Today that means the package must still represent a supported tarot roster for the current deterministic reading engine.

## 9) API Implications
This PRD does not replace `prd-06`, but it sharpens what the upcoming deck APIs need to expose.

At minimum, the implementation must support:
- fetching one deck instance with its version metadata,
- listing and editing cards,
- listing and editing symbols,
- linking and unlinking symbols to cards,
- creating, updating, and archiving card information entries,
- creating, updating, and archiving symbol information entries,
- exporting one deck as the canonical JSON package above,
- importing one JSON package into a new owned deck.

Preferred external identifier rules:
- deck routes use deck instance `id`,
- card and symbol detail payloads include both internal `id` and portable `cardId`/`symbolId`,
- exports use only portable identifiers for deck content.

V1 UX shaping rules for the API:
- Deck detail payloads should include enough image-reference, link, and source metadata to support a deck-library-first UI without extra lookup endpoints for basic views.
- Card and symbol detail flows should support bidirectional browsing between linked cards and linked symbols.
- First-party entry mutation flows only need to create and edit `plain_text` and `markdown` entries, even though the underlying schema still supports `json`.
- Source payloads must be sufficient for lightweight in-place visibility and editing rather than forcing a dedicated source-management screen.

## 10) Acceptance Criteria
This spec is implemented correctly when:
- choosing the built-in starter deck during onboarding creates a user-owned editable deck instance,
- a user can initialize a deck from starter content or an empty template,
- starter-content decks feel immediately usable because they include bundled symbols, links, entries, sources, and image references, even when the content is mock,
- empty-template decks still create deterministic readings successfully,
- symbols are independently viewable and linkable to multiple cards,
- card and symbol information can be added as ordered entries instead of one fixed meaning field,
- the first-party V1 editing experience supports `plain_text` and `markdown` entries without requiring direct `json` authoring,
- sources are visible and lightly editable from deck-management flows without needing a separate source workspace,
- deck exports preserve cards, symbols, links, entries, and source metadata,
- V1 deck-management can expose basic import/export actions without requiring a full package review workflow,
- importing that package creates a new owned deck without losing portable identifiers,
- deck and card images are displayable in V1 without requiring image editing/upload,
- past readings remain deterministic because `deckSpecVersion` only changes when the ordered card roster changes,
- deck knowledge can evolve without invalidating old reading assignment records because those edits advance `knowledgeVersion`, not `deckSpecVersion`.

## 11) Implementation Sequencing
This PRD is intended to unblock the next four branches in this order:
1. `feature/knowledge-domain-baseline`
2. `feature/reading-studio-durable-wiring`
3. `feature/deck-management-surface`
4. `feature/provider-connections-openai-baseline`

The most important immediate implementation consequence is:
- build the knowledge domain around user-owned deck instances and portable `cardId` / `symbolId` values,
- not around a shared seeded catalog row that users cannot actually own, export, or evolve.
