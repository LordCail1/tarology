# PRD 15 - Sharing, Engagement, and Monetization

Source: Strategic expansion planning session (2026-03-08)
Horizon: V2

## 1) Purpose
Add private artifact sharing and durable monetization while preserving trust-first product behavior.

## 2) Scope
### 2.1 In Scope
- Private sharing of selected artifacts (storyboard, fusion, dialogue summaries).
- Tokenized links with expiry + revocation controls.
- Entitlements model with subscription + optional usage packs.
- Reflective progression system (non-manipulative engagement).

### 2.2 Out of Scope
- Public feed in initial rollout.
- Engagement loops designed for compulsion/addiction.
- Open creator marketplace at launch.

## 3) Product Rules
- Sharing starts private-first: unlisted links by default.
- Engagement is reflective and educational, not streak-pressure based.
- Monetization must not weaken safety policy or provenance requirements.

## 4) APIs and Contracts
New endpoints:
- `POST /v1/share-links`
- `GET /v1/share-links/{token}`
- `GET /v1/entitlements`

Required types:
- `ShareArtifactRef`
- `ShareVisibility`
- `EntitlementPlan`
- `UsageBudget`

Required entities:
- `share_links`
- `billing_entitlements`
- `usage_events`

## 5) Sharing Policy
- Default visibility: `unlisted`.
- Every share link has expiration and revocation support.
- Access scope must bind to artifact and owner policy.

## 6) Monetization Policy
- Subscription unlocks baseline monthly generation budget.
- Usage packs top up when budget is exhausted.
- Safety-critical messaging remains available regardless of plan.

## 7) Acceptance Criteria
1. Share links support creation, retrieval, expiry, and revocation.
2. Unauthorized access to share tokens is blocked.
3. Entitlement checks gate paid generation flows correctly.
4. Usage pack decrementing is consistent and auditable.
5. Reflective progression metrics exclude manipulative streak pressure.

## 8) Metrics
- `% private shares created per active reader`
- `% shared artifacts revisited by owner`
- subscription conversion rate
- usage-pack attach rate
- retention uplift without manipulative loop indicators
