---
name: Solaris Slate
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#d1c6ab'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#9a9078'
  outline-variant: '#4d4632'
  surface-tint: '#eec200'
  primary: '#facc15'
  on-primary: '#3c2f00'
  primary-container: '#facc15'
  on-primary-container: '#6c5700'
  inverse-primary: '#735c00'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#c7f5ff'
  on-tertiary: '#00363e'
  tertiary-container: '#33e4ff'
  on-tertiary-container: '#006270'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe083'
  primary-fixed-dim: '#eec200'
  on-primary-fixed: '#231b00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#a0efff'
  tertiary-fixed-dim: '#15daf4'
  on-tertiary-fixed: '#001f25'
  on-tertiary-fixed-variant: '#004e59'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  status-valid: '#4ade80'
  status-valid-text: '#86efac'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  DEFAULT: 0.125rem
  lg: 0.25rem
  xl: 0.5rem
  full: 0.75rem
  pill: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  sidebar-width: 64px
  header-height: 64px
  status-footer-height: 28px
---

## Brand & Style
The design system moves away from typical tech-neon palettes toward a high-contrast, industrial-luxe aesthetic. It targets professional environments that demand high legibility and a sense of "prestige" utility.

The style is **Modern-Industrial**: combining the precision of a systematic layout with the warmth of a rich yellow primary hue. It leverages deep midnight slate backgrounds to ground the interface, while the primary yellow acts as a high-visibility signal for action and focus. The emotional response should be one of focused energy, reliability, and technical sophistication.

## Colors
The palette follows a Material Design 3–style token model on a **Deep Midnight** foundation (`#0B1326`). Primary yellow vibrates with intent without causing eye strain.

- **Primary (`#FACC15`):** Critical actions, active states, focus rings, graph edges, and syntax keywords.
- **On-primary (`#3C2F00`):** Text and icons on solid primary surfaces (buttons, active nav pills).
- **Primary-fixed (`#FFE083`):** Hover accents and syntax highlights on dark backgrounds.
- **Primary-fixed-dim (`#EEC200`):** Active-button hover state and surface tint.
- **On-surface (`#DAE2FD`):** Primary readable text on dark surfaces.
- **On-surface-variant (`#D1C6AB`):** De-emphasized labels, metadata, and canvas chrome.
- **Secondary / secondary-container (`#B9C8DE` / `#39485A`):** Muted UI chrome, nav group borders, and hover fills.
- **Tertiary / tertiary-fixed-dim (`#C7F5FF` / `#15DAF4`):** Code syntax accents (constants, string literals).
- **Outline / outline-variant (`#9A9078` / `#4D4632`):** Borders, dividers, line-number gutters, and scrollbar thumbs.
- **Status-valid (`#4ADE80` / `#86EFAC`):** Success and validation states in the status footer (distinct from primary yellow).

## Typography
The typography strategy blends contemporary grotesque precision with technical monospaced utility.

- **Headlines:** Hanken Grotesk (400, 600, 800) with tight letter-spacing and heavy weights for authoritative presence. Panel titles may scale down to 14px in compact headers.
- **Body:** Inter (400, 600, 700) for chat copy, inputs, and interface descriptions.
- **Labels:** JetBrains Mono (400, 500) for metadata, status tags, code blocks, and canvas labels. Micro sizes (10–11px) appear in badges, status pills, and assistant subtitles.
- **Code:** JetBrains Mono with semantic color tokens — `primary` for keywords, `primary-fixed` for identifiers, `tertiary-fixed-dim` for declarations, `tertiary` for literals, `outline` for comments.

## Layout & Spacing
The application shell is a **full-height column** (`h-screen`, `overflow-hidden`) with three fixed regions.

- **Header (64px):** Brand title left, centered view navigation, action buttons and avatar right. Horizontal padding uses the 24px gutter token.
- **Main (flex-1):** Horizontal split between the chat drawer and workspace column. Panels support `is-half` (50% width) and `is-full` (100% width) layout modes driven by view toggles.
- **Status footer (28px):** Persistent validation strip along the bottom edge.

**View model:** Chat, Workflow, and Code are independently toggleable. At least one view must remain active. Workflow and Code are mutually exclusive within the workspace column. When chat pairs with a workspace view, both columns render at 50% width with a right border on the chat drawer.

- **Grid rhythm:** All vertical spacing is a multiple of the 8px base unit.
- **Canvas grid:** Workflow graph uses a 24×24px radial dot pattern (`surface-container-highest` dots on `background`).
- **Mobile:** Margins shrink to 20px; multi-column layouts reflow into a single-column vertical stack.

## Elevation & Depth
Depth is achieved through **tonal layering** and selective effects rather than heavy drop shadows.

- **Level 0 (Base):** `background` / `surface` (`#0B1326`) — app canvas and graph background.
- **Level 1 (Panels):** `surface-container-low` (`#131B2E`) — composer bar, status footer, code drawer chrome.
- **Level 2 (Cards / nodes):** `surface-container` (`#171F33`) — workflow nodes, chat container.
- **Level 3 (Raised chrome):** `surface-container-high` / `surface-container-highest` (`#222A3D` / `#2D3449`) — chat header, assistant bubbles, avatar rings.
- **Level 4 (Inset wells):** `surface-container-lowest` (`#060E20`) — nav group backgrounds, input fields, code drawer body.
- **Glass panels:** `backdrop-filter: blur(12px)` with `rgba(11, 19, 38, 0.85)` for floating overlays.
- **Glow-primary:** `box-shadow: 0 0 15px rgba(250, 204, 21, 0.2)` on active graph nodes.
- **Focus accents:** 1px primary borders and rings replace heavy shadows for selection states.

## Shapes
The shape language is **Tight (0.125rem default)** with graduated rounding for larger containers.

- **Controls (buttons, inputs, nav pills):** 0.125rem (`rounded`) or 0.25rem (`rounded-lg`).
- **Cards and nodes:** 0.25rem (`rounded-lg`).
- **Nav groups:** 0.375rem inner workspace group, 0.5rem outer view-nav group.
- **Avatars and status dots:** `pill` (9999px) for circular elements.
- **Scrollbars:** 3px thumb radius on 6px-wide tracks.

## Iconography
**Material Symbols Outlined** at 18px for header and nav controls, 14px for inline chat avatars. Default variation: `'FILL' 0, 'wght' 400`. Filled variation (`'FILL' 1`) marks active node types and the assistant avatar.

## Motion & Effects
- **Drawer transitions:** `0.3s cubic-bezier(0.4, 0, 0.2, 1)` on panel show/hide and layout reflow.
- **Control hovers:** `0.15s ease` on color, background, border, and filter properties.
- **Canvas parallax:** Subtle `translate` on mouse movement for graph content depth.
- **Active pulse:** Primary-colored dot with `animate-pulse` on transmitting nodes.
- **Primary button hover:** `filter: brightness(1.08)` or `brightness(1.10)` instead of color swaps.

## Components

### View navigation
Segmented icon control centered in the header.

- **Outer group:** `surface-container-lowest` fill, `secondary-container` border, 0.5rem radius, 4px internal padding.
- **Workspace sub-group:** `surface-container-low` fill, `surface-container-high` border, 0.375rem radius — nests Workflow and Code toggles.
- **Nav button (32×32):** Transparent default, `on-surface` icon. Hover: `primary-fixed` icon, `secondary-container` fill. Active: solid `primary` fill, `on-primary` icon and border.

### Header action buttons
Square icon buttons (32×32) for secondary actions (e.g. Save).

- **Default:** Transparent background, `outline-variant` border, `on-surface` icon.
- **Hover:** `secondary-container` fill, `outline` border, `primary-fixed` icon.
- **Primary variant (`--primary`):** Solid `primary` fill with `on-primary` icon; hover uses brightness filter only.

### Buttons (general)
- **Primary:** Solid `primary` background, `on-primary` text/icon. Used for send, execute, and lint actions.
- **Secondary / canvas controls:** `surface-container` fill, `outline-variant` border, hover transitions icon color to `primary`.
- **Chip actions:** `primary/10` background, `primary` text, `primary/20` border, 11px bold uppercase (e.g. "Lint Code", "ACTIVE").

### Inputs
- **Composer input:** `surface-container-lowest` background, `outline-variant` border, `on-surface` text, `outline` placeholder. Focus: `ring-1 ring-primary`, `border-primary`.
- **Composer bar:** `surface-container-low` background, top border `outline-variant`, 16px horizontal / 24px bottom padding. Minimum row height 50px.

### Chat
- **Assistant bubble:** `surface-container-high` fill, `outline-variant/30` border, `rounded-lg rounded-tl-none` (tail on top-left).
- **User bubble:** `primary/10` fill, `primary/20` border, `rounded-lg rounded-tr-none` (tail on top-right).
- **Avatars:** 24px (chat) or 32px (header/composer); assistant uses `primary-container` square icon well, user uses circular photo with `outline-variant` border.

### Workflow canvas
- **Nodes:** `surface-container` cards with `outline-variant` border; selected/active nodes use `border-primary` and `glow-primary`.
- **Edges:** 2px `primary` SVG paths at 60% opacity.
- **Canvas header:** Semi-transparent `surface-container-high/40` strip with uppercase `label-sm` title.
- **Controls:** 40×40 floating buttons bottom-left with `shadow-lg`.

### Code drawer
- **Header:** `surface-container-low` with `outline-variant` bottom border, primary code icon, "Logic Source" label, lint chip action.
- **Body:** `surface-container-lowest` background, line-number gutter via `::before` pseudo-element in `outline-variant`.
- **Layout:** Mutually exclusive with graph drawer; expands to `flex-1` when Code view is active.

### Status footer
- **Container:** `surface-container-low` background, `outline-variant` top border, 28px height, 16px horizontal padding.
- **Valid pill:** `status-valid-text` text, `status-valid` dot with soft green glow, `rgba(74, 222, 128, 0.12)` background, `rgba(74, 222, 128, 0.35)` border. 10px JetBrains Mono uppercase.

### Scrollbars
Custom webkit scrollbars: 6px width, transparent track, `surface-container-highest` thumb, `outline-variant` thumb on hover.
