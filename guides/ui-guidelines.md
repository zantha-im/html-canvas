# UI Guidelines

Portable, mobile-first patterns and a dark theme baseline.

## Philosophy
- Primary target: mobile; desktop enhances mobile.
- Accessibility: keyboard and screen reader friendly.
- Performance: minimize work per interaction; perceived speed matters.

## Application Layout

- Left-hand navigation sidebar paired with a right-hand content pane.
- Sidebar behavior
  - Default width 240–280px; supports icons-only collapsed state.
  - Below small screens: off-canvas overlay; closes on overlay click, Esc, or swipe.
  - Toggle is keyboard accessible; restore focus to the toggle on close.
  - Persist last state (expanded/collapsed) per user/device when appropriate.
- Content pane
  - Primary work surface; scroll only the content pane (sidebar/header remain fixed).
  - Support sticky section headers and optional in-pane secondary tabs.
  - Provide consistent empty, loading, and error states within the pane.
- Responsive rules
  - ≥ lg: sidebar fixed and expanded by default.
  - md: allow collapsed icons-only state with tooltip labels.
  - ≤ sm: off-canvas; disable body scroll while open; trap focus inside overlay.
- Accessibility
  - Use landmarks: `header`, `nav` (sidebar), and `main` (content).
  - Provide a visible skip-to-content link.
  - Manage focus on open/close; ensure visible focus rings.

## Visual Design
- Dark theme palette:
  - Content background: #1E2128
  - Card background: #252831 with #343741 border
  - Text: #FFFFFF
  - Link: #4693D1
  - Primary: #1878B9
  - Success: #469B3B
- Spacing: 8px grid; consistent paddings and gaps.
- Card layout: related fields grouped; consistent section headers.

## Interaction
- Touch targets ≥ 48px height.
- Immediate visual feedback on interactions.
- Clear loading states for async work.
- Inline error messages near fields; summary at step boundary when relevant.

## Multi-step Wizard
- Reduce cognitive load for complex forms.
- Progress indicator with step titles; back navigation always available.
- Block next step until validation passes.

## Responsive Behavior
- Collapsible navigation on small screens.
- Gesture support where appropriate; manage focus correctly.
