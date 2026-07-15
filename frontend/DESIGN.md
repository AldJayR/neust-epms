---
name: NEUST Extension Project Monitoring System
description: Calm institutional clarity for extension work from proposal through reporting.
colors:
  sea-ink: "#173a40"
  sea-ink-soft: "#416166"
  lagoon: "#4fb8b2"
  lagoon-deep: "#328f97"
  palm: "#2f6a4a"
  background: "#f3f8f4"
  surface: "#ffffff"
  muted: "#edf4ef"
  border: "#d7e5dc"
  destructive: "#b42318"
  warning: "#a15c00"
  dark-background: "#121513"
  dark-surface: "#1b1f1d"
  dark-foreground: "#eef4f1"
typography:
  display:
    fontFamily: "Roboto Variable, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Roboto Variable, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "Roboto Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "Roboto Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Roboto Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lagoon-deep}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "#28777d"
    textColor: "{colors.surface}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.sea-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.sea-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.sea-ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  status-badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.sea-ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 6px"
    height: "22px"
---

# Design System: NEUST Extension Project Monitoring System

## Overview

**Creative North Star: "The Clear Current"**

EPMS should feel like work moving visibly and steadily through one connected institutional flow. Its visual language is calm, dependable, and direct: familiar controls, compact hierarchy, and explicit states keep faculty focused on the next required action while giving reviewing roles trustworthy oversight.

The system uses restrained color, gently curved geometry, and role-aware navigation rather than spectacle. It explicitly rejects the generic SaaS dashboard: decorative metrics, excessive card grids, gradients, and startup-style flourishes must never compete with proposal, monitoring, or reporting work.

**Key Characteristics:**

- Restrained sea-ink and lagoon palette with semantic status colors.
- Compact Roboto hierarchy optimized for forms, tables, and workflow labels.
- Structural borders and tonal layers with minimal shadow.
- Familiar, decisive controls with visible hover, focus, disabled, loading, and error states.
- Responsive app shell with role-specific navigation and content-first mobile behavior.

**The Current Rule.** Every screen must reveal where the work is, who owns it, and what happens next.

## Colors

Sea ink and lagoon create a quiet institutional palette: deep blue-green carries information, while lagoon marks actions and current state without becoming decoration.

### Primary

- **Lagoon Deep** (`#328f97`): Primary actions, focus rings, selected navigation, links, and active data states.
- **Lagoon** (`#4fb8b2`): Supporting chart series and the higher-luminance dark-theme action color.

### Secondary

- **Palm** (`#2f6a4a`): Success, completion, and affirmative status. It is semantic, not decorative.

### Tertiary

- **Warning Ochre** (`#a15c00`): Attention-required and pending states.
- **Destructive Red** (`#b42318`): Rejection, deletion, overdue, and irreversible actions.

### Neutral

- **Sea Ink** (`#173a40`): Primary text, headings, and high-emphasis labels.
- **Soft Sea Ink** (`#416166`): Secondary text that must remain readable against light surfaces.
- **Foam Background** (`#f3f8f4`): The light-theme application canvas.
- **White Surface** (`#ffffff`): Sidebars, cards, dialogs, menus, and content containers.
- **Muted Wash** (`#edf4ef`): Hover, selected-neutral, skeleton, and secondary-control states.
- **Quiet Border** (`#d7e5dc`): Fields, dividers, cards, and structural boundaries.
- **Night Background** (`#121513`), **Night Surface** (`#1b1f1d`), and **Night Foreground** (`#eef4f1`): Dark-theme canvas, raised surface, and primary text.

**The Accent Earns Its Place Rule.** Lagoon is reserved for primary action, focus, selection, links, and state. Never use it as ambient decoration.

**The Semantic Color Rule.** Success, warning, destructive, and informational colors must always retain their established meaning and must be reinforced by text or iconography.

## Typography

**Display Font:** Roboto Variable (with `sans-serif` fallback)  
**Body Font:** Roboto Variable (with `sans-serif` fallback)  
**Label/Mono Font:** No separate family; use Roboto Variable.

**Character:** One familiar humanist sans keeps the interface cohesive across dense tables, forms, navigation, and status copy. Hierarchy comes from size, weight, and spacing rather than a decorative font pairing.

### Hierarchy

- **Display** (600, `2rem`, 1.2): Exceptional top-level moments only; ordinary product screens do not need display scale.
- **Headline** (600, `1.5rem`, 1.25): Page titles and dashboard greetings.
- **Title** (500, `1rem`, 1.5): Card titles, dialog titles, and strong row labels.
- **Body** (400, `0.875rem`, 1.5): Default product copy, field values, and table content. Prose must stay within 65-75 characters per line.
- **Label** (500, `0.75rem`, 1.3): Metadata, compact statuses, field support, and navigation details.

**The One-Family Rule.** Never introduce a display face into product labels, buttons, tables, or forms. Roboto carries the system.

**The Fixed-Scale Rule.** Product typography uses fixed rem sizes. Do not use fluid display scaling inside the authenticated application shell.

## Elevation

Elevation is structural only. Borders and tonal contrast define the app shell, cards, menus, fields, and dialogs; a low one-pixel shadow may clarify separation but must never become a decorative glow or floating-card effect.

### Shadow Vocabulary

- **Structural Lift** (`0 1px 2px rgba(23, 58, 64, 0.08)`): Cards, metrics, and bounded work surfaces in the light theme.
- **Night Structural Lift** (`0 1px 2px rgba(0, 0, 0, 0.22)`): The same separation role on dark surfaces.

**The Border-First Rule.** If a surface can be understood through background and a one-pixel border, no additional shadow is allowed.

## Components

Components are familiar and decisive. Standard affordances disappear into the task, while state changes remain explicit and accessible.

### Buttons

- **Shape:** Gently curved (`8px` standard; compact controls may use `6px`).
- **Primary:** Lagoon Deep background with white text, medium Roboto, `36px` height, and compact horizontal padding. Use one primary action per local decision area.
- **Hover / Focus:** Darken to `#28777d` on hover; use a visible Lagoon Deep focus border with a three-pixel translucent ring. Active buttons may move down by one pixel. Disabled buttons retain shape and drop to 50% opacity.
- **Secondary / Ghost / Destructive:** Outline controls use a white surface and Quiet Border; ghost controls gain only a Muted Wash on interaction; destructive controls use a restrained red tint until activated.

### Chips

- **Style:** Status badges use a white surface, Quiet Border, Soft Sea Ink label, a `12px` semantic icon, and a compact `22px` height.
- **State:** Color belongs to the icon and meaning, not to a fully saturated badge background. Every badge exposes a readable label and explanatory tooltip.

### Cards / Containers

- **Corner Style:** Gently rounded (`12px`).
- **Background:** White Surface in light mode and Night Surface in dark mode.
- **Shadow Strategy:** Structural Lift only; borders and tonal layering do most of the work.
- **Border:** One-pixel Quiet Border or an equivalent low-contrast ring.
- **Internal Padding:** `16px` for compact records and metrics; `24px` for standard cards and dialogs.

Cards group one coherent work object or bounded control area. Do not place cards inside cards, and do not turn every section into an identical card.

### Inputs / Fields

- **Style:** Transparent or surface-matched fill, one-pixel Input border, `8px` radius, `36px` height, and `10px` horizontal padding.
- **Focus:** Lagoon Deep border and a three-pixel translucent focus ring; focus must never depend on color alone.
- **Error / Disabled:** Invalid fields use destructive border and ring with adjacent explanatory text. Disabled fields retain readable values, use 50% opacity, and cannot receive pointer interaction.

### Navigation

- The desktop shell uses a collapsible left sidebar with grouped role-specific destinations, Lucide icons, and clear active state through the Muted Wash and foreground text.
- Navigation labels use compact body and label sizes, never display typography. Hover and active states share the same vocabulary across roles.
- On narrow screens, the sidebar collapses into the established mobile drawer behavior while content spacing tightens from `32px` to `16px`.

### Status Badge

Status is a signature workflow component. Every status combines plain-language text, a semantic icon, and an explanatory tooltip; color alone is never the carrier of meaning. Pending motion must honor reduced-motion preferences.

### Metric Summary

Metrics use a compact bounded surface, a small descriptive label, and a `1.875rem` semibold value. They summarize operational context only. They must not become hero metrics or decorative dashboard filler.

## Do's and Don'ts

### Do:

- **Do** make current status, owner, and next action visible without opening a secondary panel.
- **Do** use Lagoon Deep (`#328f97`) only for primary action, focus, selection, links, and state.
- **Do** preserve the same control shape and interaction vocabulary across faculty, RET Chair, Director, and administrator screens.
- **Do** use skeletons for content loading and instructive empty states that explain the next available action.
- **Do** maintain WCAG 2.2 AA contrast, keyboard behavior, visible focus, robust labels, and reduced-motion alternatives.

### Don't:

- **Don't** resemble a generic SaaS dashboard: decorative metrics, excessive card grids, gradients, and startup-style visual flourishes are prohibited.
- **Don't** nest cards or repeat identical icon-heading-copy cards as page scaffolding.
- **Don't** use gradient text, glassmorphism, thick colored side stripes, or arbitrary z-index values.
- **Don't** use lagoon, success, warning, or destructive colors as decoration detached from action or state.
- **Don't** invent custom affordances when a standard button, field, table, menu, tooltip, or dialog already communicates the task.
- **Don't** animate product content for spectacle; motion exists only to explain state and must stop or simplify under reduced-motion preferences.
