# PRD 02 - V1 Scope and UX Blueprint

Source: `CHARTER.md` (v0.3 extraction)
Coverage: sections 4 and 5

## 4) V1 Scope
### 4.1 In Scope
- Google sign-in.
- Provider connection management for LLM access:
  - user can add API keys,
  - user can connect provider-backed accounts where supported by a given provider/runtime,
  - user can keep one or both configured where available.
- Deck library and knowledge management:
  - user can initialize a deck from starter content or an empty template,
  - choosing the built-in starter deck creates a personal editable deck copy rather than leaving the user on a shared template row,
  - user can browse decks, cards, and symbols,
  - user can add/edit card information,
  - user can add/edit symbol information and link symbols to cards,
  - user can browse symbols independently from cards, with bidirectional card/symbol linking in the UI,
  - user can export/import private deck state for cloning or sharing,
  - first-party V1 knowledge editing focuses on layered `plain_text` and `markdown` entries,
  - sources remain minimal but visible inside deck-management flows,
  - deck/card images are viewable in V1 but not yet user-editable.
- ChatGPT-like shell:
  - left: reading history (collapsible, animated, desktop-resizable),
  - center: card fan + canvas with mode selection,
  - right: question threads + interpretation history (collapsible, animated, desktop-resizable).
- First-run preference capture for default tarot deck.
- New reading creation with deterministic deck order and reversal assignment.
- New reading preflight supports deck override before shuffle/assignment.
- Card interactions: draw, flip, drag, rotate, select, group, rename group, and grid-snap placement in grid mode.
- Canvas modes:
  - `freeform` mode for unconstrained positioning.
  - `grid` mode for snap-to-cell placement.
- Question tree:
  - 1 root question,
  - unlimited child questions.
- AI interpretation request against frozen `(question, group, stateVersion)` context.
- Near-realtime backend persistence with restore.
- Basic profile with learning/reflection stats.

### 4.2 Out of Scope (V1)
- Public social feed and sharing marketplace.
- Real-time collaborative readings.
- Payments/subscriptions.
- Voice mode.
- Native mobile apps.

### 4.3 Model Provider Connections (V1)
Supported credential modes:
- `api_key`: user pastes provider API key (encrypted at rest).
- `provider_account`: user authenticates with a provider-backed account/subscription flow when the provider/runtime supports it for this product shape.

Product requirement:
- User can configure one or many provider connections.
- User can set default provider/model per workspace.
- User can override provider/model per interpretation request.
- Provider connection auth is separate from app account auth (Google sign-in remains required for the app).
- V1 provider connectivity is OpenAI-first.
- Public hosted use centers on OpenAI `api_key` mode.
- OpenAI `provider_account` mode is internal-only in V1 and visible only to allowlisted Tarology accounts.

Important feasibility note (as of 2026-03-08):
- Some providers document API-key auth for inference but may not expose a supported provider-account flow that lets a third-party app use a user's subscription/account directly.
- OpenAI should be implemented first behind capability checks so product behavior matches current provider auth support at runtime.
- Provider-account mode must remain capability-driven and must not assume one fixed protocol such as OAuth.

V1 support policy:
- Ship OpenAI `api_key` mode as the public baseline.
- Ship OpenAI `provider_account` mode only for allowlisted internal accounts in V1.
- Future providers may add either `api_key` or `provider_account` support behind capability flags.
- If provider-account mode is unavailable for a provider/runtime, UI must say “Not available for this provider yet” and offer API key setup when applicable.

## 5) UX Blueprint
### 5.1 Layout
- Left Sidebar:
  - readings list,
  - search/filter,
  - new reading action.
- Main Workspace:
  - reading title + status bar,
  - fan of face-down cards,
  - mode-aware card canvas (`freeform` / `grid`).
- Right Panel:
  - question thread tree,
  - card groups,
  - interpretation outputs with citations and uncertainty note.
- Panel behavior:
  - left and right panels can collapse/expand with motion.
  - left and right panels are desktop-resizable by drag handle.
  - panel width preference is persisted per user.

### 5.1.1 Reading Lifecycle and Reader Labels
- Canonical reading lifecycle is `active`, `archived`, or `deleted`.
- `reopen` is an action that returns an archived reading to `active`; it is not a separate status.
- Reader-facing organization states such as `completed` or custom labels may exist later, but they are not lifecycle and must not be treated as the source of truth for restore/history behavior.

### 5.2 Core Journey
1. User logs in with Google.
2. On first login, user selects or initializes a default tarot deck (starter-content or empty); choosing the built-in starter deck creates a personal owned copy and the preference is persisted.
3. User may review/edit cards and symbols in that deck before beginning a reading.
4. User starts a new reading, can override deck selection, and writes root question.
5. Backend creates deterministic deck assignment for the selected deck and persists commitment metadata.
6. User draws cards; each draw reveals the pre-assigned card.
7. User arranges cards on canvas (freeform drag/rotate or grid-snap mode), groups selected cards, asks sub-questions.
8. User requests interpretation for selected group under selected thread.
9. If selected-card count exceeds configured threshold, UI shows a high-cost warning with estimated token/time usage and requires explicit continue.
10. User can stop/cancel interpretation at any time from a visible control.
11. System returns:
  - plain summary,
  - “why” layer with card/symbol/deck-knowledge evidence,
  - optional deep layer with attached knowledge references.
12. All meaningful actions persist continuously.
13. User returns later and sees exact reading state restored, including chosen deck and canvas mode.
