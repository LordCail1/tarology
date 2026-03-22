# PRD 03 - Deterministic Deck and Randomness

Source: `CHARTER.md` (v0.3 extraction)
Coverage: section 6

## 6) Deterministic Deck and Randomness
### 6.1 Hard Rule
Card identity and reversal meaning are assigned at reading creation. They are never generated at reveal time.

### 6.2 Required Metadata
Store at reading creation:
- `deckId`
- `deckSpecVersion`
- `shuffleAlgorithmVersion`
- `seedCommitment`
- `orderHash`
- `assignedReversalBits`
- `createdAt`

### 6.3 Algorithm
1. Generate secure random seed/nonce (CSPRNG).
2. Run seeded Fisher-Yates over the selected deck card list.
3. Persist ordered mapping (`deckIndex -> cardId`) for that deck.
4. Persist reversal assignment bits.
5. Render face-down fan from persisted mapping.

### 6.4 V1.1 Extension
Add public randomness proof page (commit-reveal with optional beacon integration) after V1 stability.
