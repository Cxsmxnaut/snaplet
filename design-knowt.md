# Knowt Design Pass

This file captures the signed-in Knowt product patterns we are using as the visual reference for Snaplet's authenticated app surfaces.

Landing page is intentionally excluded from this pass.

## Core Feel

- Dark, almost-black workspace background.
- Flatter surfaces instead of glossy card stacks.
- Very soft borders, low shadow, minimal gradients.
- Strong emphasis on layout rhythm over decorative components.
- Navigation feels product-like and persistent, not website-like.

## Color System

- Background: near-black canvas.
- Surfaces: dark charcoal layers with subtle separation.
- Accent: mint / aqua for create and highlighted actions.
- Text: bright white for primary, softened gray for secondary.
- Status colors are used sparingly and mostly inside icons or small counters.

## Layout Rules

- Left rail is narrow and persistent.
- Main content starts from a fixed shell offset, with generous horizontal breathing room.
- Top chrome is slim and utility-first: search, create, progress/streak, profile.
- Empty states are centered and spacious.
- Content pages should feel like a workspace, not a marketing page with many stacked feature cards.

## Sidebar Patterns

- Logo at top.
- Section labels like `Main`, `Library`, `Support`.
- Active item uses a quiet filled state, not a loud gradient.
- Icon-first structure remains readable even when collapsed.
- Secondary actions should look like simple rows, not embedded promo cards.

## Top Bar Patterns

- Large rounded search surface.
- Create button is always prominent and mint.
- Small rounded counters/actions to the right.
- Profile menu is dark, dense, and utility-heavy.

## Panel Patterns

- Panels are dark blocks with a faint border.
- Border radius is present but not exaggerated.
- Shadows should be restrained.
- Avoid stacking too many differently styled containers on one screen.

## Page Direction

### Home

- Should feel closest to Knowt home.
- Strong welcome heading.
- Creation and resume actions should be immediately visible.
- Empty states should feel intentional, not sparse by accident.

### Chat

- Empty state centered.
- Composer is the main interaction object.
- Once a thread exists, the header simplifies and the composer stays pinned.
- History and overflow menu should mirror real chat-app behavior.

### Library / Kits

- Cleaner filters and search.
- Results should read more like a workspace inventory than flashy cards.

### Progress

- Needs one dominant story at a time.
- Metrics should feel analytical and compact, not like many equal cards.

### Settings / Help / Legal

- These should inherit the same dark workspace language.
- Content blocks should be flatter and easier to scan.

## Interaction Notes

- Avoid glow-heavy focus states in dark mode.
- Hover effects should be subtle.
- Rounded buttons should feel solid, not bubbly.
- Input behavior should favor fast keyboard use.

## Snaplet Mapping

- `frontend/src/index.css`: theme tokens and shared surfaces.
- `frontend/src/components/Sidebar.tsx`: Knowt-style left rail.
- `frontend/src/components/TopBar.tsx`: search / create / counters / profile chrome.
- `frontend/src/components/AppShell.tsx`: overall shell spacing.
- `frontend/src/pages/AssistantPage.tsx`: Knowt-inspired AI chat behavior and layout.
- `frontend/src/pages/Dashboard.tsx`: home/workspace direction.
- `frontend/src/pages/KitsPage.tsx`: library inventory direction.
- `frontend/src/pages/ProgressPage.tsx`: flatter analytical layout.
- `frontend/src/pages/SettingsPage.tsx`: workspace-consistent settings styling.

## Guardrails

- Do not touch the landing page in this pass.
- Prefer system-wide alignment over one-off visual tricks.
- If a page looks "AI-generated", flatten it and remove unnecessary containers first.
