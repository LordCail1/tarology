# PRD 07 - Persistence and Concurrency

Source: `CHARTER.md` (v0.3 extraction)
Coverage: section 11

## 11) Persistence, Restore, and Concurrency
1. Client creates semantic command (not raw pixel stream).
2. Server validates auth + ownership + schema.
3. Server applies mutation transactionally.
4. Server appends event and updates projection.
5. Server returns new aggregate version.
6. Client acknowledges command and removes from local retry queue.

Rules:
- Persist drag/rotate end events, not every movement tick.
- Persist panel width preference updates on drag-end (not continuously) as user preference changes.
- Snapshot every 25-50 semantic events or milestone actions.
- Restore path: latest snapshot + tail events.
- Use optimistic concurrency for semantic edits.
- For low-value layout conflicts, last-write-wins is acceptable.
- Lifecycle persistence is limited to canonical reading states (`active`, `archived`, `deleted`); reader-defined labels or progress markers are separate metadata and must not change restore semantics.

Event/outbox requirement:
- Domain events are written transactionally with state changes.
- Outbox dispatcher publishes integration-safe events.
- Minimum event set for future integrations:
  - `reading.created`
  - `reading.updated`
  - `reading.archived`
  - `reading.reopened`
  - `reading.deleted`
  - `interpretation.completed`
  - `interpretation.cancelled`
  - `interpretation.warning-triggered`
  - `question.created`
  - `card-group.created`
