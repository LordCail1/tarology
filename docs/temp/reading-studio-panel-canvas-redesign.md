# Temporary Working Note: Reading Studio Panel + Canvas Redesign

Status: temporary handoff note for the feature thread focused on left/right panel collapse and desktop resize

Purpose:
- preserve the product decisions made in this thread before context compaction
- give a future agent enough context to implement the feature correctly without re-deriving the UX model from scratch
- this is not yet a canonical PRD; fold the accepted parts into the real docs later if implementation proceeds

## Feature Area
- Reading Studio desktop side panels
- Reading Studio freeform canvas behavior during panel/window layout changes

Primary files likely involved:
- `/home/ram2c/gitclones/tarology/apps/web/components/reading/reading-studio-shell.tsx`
- `/home/ram2c/gitclones/tarology/apps/web/components/reading/canvas-panel.tsx`
- `/home/ram2c/gitclones/tarology/apps/web/lib/reading-studio-canvas.ts`
- `/home/ram2c/gitclones/tarology/apps/web/app/globals.css`
- `/home/ram2c/gitclones/tarology/apps/web/components/reading/reading-studio-shell.test.tsx`

## Manual Findings From This Thread
1. Desktop panel expand/collapse is effectively instant right now.
- There is no satisfying smooth desktop motion when the left/right sidebars collapse or expand.

2. Left/right panel behavior is asymmetric from the reader's point of view.
- If a card is near the left edge and the left panel expands, the card remains visually reachable.
- If a card is near the right edge and the right panel expands, the card can become hidden/clipped.

3. The right-panel behavior is the real UX problem.
- Opening UI chrome should not make already-placed cards inaccessible.

## Product Decisions Locked In This Thread

### 1. Card positions must never be rewritten because of layout chrome changes
This is the most important rule.

Do not mutate saved card positions because of:
- panel collapse
- panel expand
- panel drag-resize
- browser window resize
- desktop/mobile viewport changes

If card positions change, it should be because the reader intentionally moved the card.

### 2. Treat the freeform canvas as a world, not as a single fixed box
The app should distinguish between:

- `spread/world state`
  - the real reading layout
  - card positions
  - rotation
  - face-up / face-down
  - other semantic reading state

- `view/viewport state`
  - what part of the spread is currently visible
  - pan/scroll offset
  - zoom level
  - possibly selected card / last interacted card

Panel changes and browser resizing should affect the viewport, not the spread.

### 2.1 Center-point stabilization is the viewport anchoring rule
When the browser window resizes or either desktop sidebar expands/collapses, the
world-space coordinate at the center of the visible freeform viewport should remain at
the center after the layout change.

Important:
- do not anchor the left edge of the viewport
- do not anchor the right edge of the viewport
- do not add edge-compensation logic
- preserve the center world point instead

### 3. If the viewport gets too small, not all cards need to remain visible at once
This is acceptable.

What is not acceptable:
- silently rewriting the spread to force-fit everything
- making cards unreachable
- losing the reader's intentional layout because of an accidental browser resize

The correct fallback when space is too small is:
- keep the spread intact
- let the viewport scroll/pan

### 4. Preserve reachability, not forced simultaneous visibility
The rule is:
- the spread may be larger than the visible viewport
- the user must still be able to reach every card

Panning is acceptable.
Zooming is acceptable.

### 5. Selected or last-interacted card does not have to stay visible
When:
- a sidebar opens
- a sidebar is resized
- the browser window resizes

the app should not auto-pan just to keep the selected card, or the most recently interacted-with card, visible.

Important:
- cards may leave the viewport
- do not rewrite the card coordinates
- `Fit Spread` is the explicit recovery tool when the reader wants to reframe the spread
- do not invent auto-reveal or edge-compensation logic

### 6. Desktop panel motion should be smooth
The shell should feel intentional.

Desktop collapse/expand should animate smoothly.
Target feel:
- subtle, not flashy
- panel and center canvas resizing should feel connected

### 7. If we are treating this as a true canvas, pan and zoom belong in the design
This thread explicitly moved in that direction.

Desired long-term canvas behavior:
- zoom in
- zoom out
- reset zoom / fit-to-spread
- pan around the spread
- middle-mouse drag pan on desktop
- `Space + drag` fallback for users who do not use middle-click comfortably

Do not make middle mouse the only panning interaction.

### 8. Pan/zoom should be view state first, not canonical reading state
Recommended default:
- reading state remains durable and semantic in the backend
- pan/zoom stays local or per-user view state initially

Rationale:
- the spread is the source of truth
- the camera/view is a personal way of looking at the spread

## Recommended UX Contract
The feature should behave according to these rules:

1. Sidebars may change the visible canvas area.
2. Sidebars must not rewrite the spread.
3. On layout changes, freeform stabilizes around the viewport center point rather than a left or right edge.
4. Cards remain reachable even if the viewport is smaller than the spread.
5. Selected or recently touched cards do not have to stay visible.
6. `Fit Spread` is the explicit recovery tool when the reader wants to reframe the spread.
7. If everything cannot fit at once, panning/zooming is acceptable.
8. Desktop panel expand/collapse must animate.
9. Left and right panel behavior should feel symmetric from the reader's perspective.

## Recommended Implementation Direction

### Phase A: Fix the shell behavior
- Add real desktop motion for left/right panel collapse and expand.
- Preserve the current drag-resize behavior, but keep the interaction visually smoother when not actively dragging.

### Phase B: Decouple the canvas world from the viewport
- Stop treating the visible canvas box as the only coordinate frame.
- Introduce a viewport layer that can move independently of the saved card positions.

### Phase C: Replace destructive clipping with a camera-first viewport model
- The canvas viewport should pan rather than relying on native scroll-container anchoring.
- Layout changes should preserve the center world coordinate of the visible viewport.
- Avoid edge-based compensation that makes one side feel “anchored” and the other feel disposable.

### Phase D: Remove auto-reveal for the selected/last-interacted card
- Do not auto-reveal the selected or last-interacted card during panel or window changes.
- If the reader wants to reframe the spread, use `Fit Spread` explicitly.

### Phase E: Add zoom and explicit navigation affordances
- Zoom in / out
- Reset / fit-to-spread
- Middle-mouse drag pan
- `Space + drag` fallback

## Things We Explicitly Do Not Want
- Rewriting card coordinates on sidebar expand/collapse
- Rewriting card coordinates on browser resize
- Cards getting hidden behind the right panel
- A tiny accidental browser resize permanently changing the spread
- A canvas model that only works if the entire spread fits in the viewport at all times

## Acceptance Criteria For This Feature Direction
1. Desktop panel expand/collapse animates smoothly.
2. Opening or resizing the right panel no longer makes previously reachable cards inaccessible.
3. Browser resizing does not rewrite saved card positions.
4. Layout changes preserve the world-space point at the center of the visible freeform viewport.
5. If the viewport becomes smaller than the spread, the user can still reach all cards by panning/zooming.
6. Selected or last-interacted card does not have to remain visible after layout changes.
7. `Fit Spread` is the explicit recovery tool for re-framing the canvas.
8. Left and right panel behavior feels symmetric to the reader.
9. Pan/zoom affects the view layer, not canonical reading layout state.

## Practical Note For The Next Agent
The current app already has a durable reading canvas model, but the freeform coordinates are effectively interpreted inside the current visible canvas box. That is why right-panel expansion can clip cards near the right edge.

The next agent should think in terms of:
- stable world coordinates for cards
- a separate viewport/camera layer
- shell chrome resizing the viewport rather than rewriting the reading

## Process Note
When implementation begins:
- create a dedicated worktree and feature branch
- do not implement from the primary checkout
- after implementation, update the canonical docs if the UX contract is accepted
