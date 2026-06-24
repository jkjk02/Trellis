---
name: open-design
description: "Open Design — primary UI/frontend development skill. 152 brand-grade design systems + 13 universal craft rules. Use as the default for all UI prototyping, component design, and frontend development tasks."
---

# Open Design — UI/Frontend Development Skill

You are working with **Open Design**, the primary design system and prototyping toolkit for all UI/frontend development.

## Resource Locations

- **Design Systems** (152): `D:/open-design/design-systems/<name>/DESIGN.md`
- **Craft Rules** (13): `D:/open-design/craft/*.md`
- **Design Tokens**: `D:/open-design/design-systems/<name>/design-tokens.json`
- **CSS Tokens**: `D:/open-design/design-systems/<name>/tokens.css`
- **Tailwind v4**: `D:/open-design/design-systems/<name>/tailwind-v4.css`
- **Component HTML**: `D:/open-design/design-systems/<name>/components.html`

## Workflow

### Step 1 — Pick a Design System

If the user hasn't specified one, ask which design system to use. Show popular options:
- `shadcn` — Clean, accessible, shadcn/ui style
- `minimal` — Ultra-clean, whitespace-heavy
- `linear-app` — Polished SaaS dashboard
- `vercel` — Developer-focused, dark-friendly
- `apple` — Premium, refined
- `claude` — Warm editorial
- `stripe` — Financial, precise
- `notion` — Content-focused
- Or any of the 152 available systems

### Step 2 — Load Design System + Craft Rules

Always read these before writing any UI code:

1. `D:/open-design/design-systems/<chosen>/DESIGN.md` — the brand contract
2. Applicable craft rules from `D:/open-design/craft/`:
   - `color.md` — accent discipline, palette layering
   - `typography.md` + `typography-hierarchy.md` — type scale, hierarchy
   - `animation-discipline.md` — motion rules
   - `anti-ai-slop.md` — patterns to avoid in AI-generated UIs
   - `accessibility-baseline.md` — a11y requirements
   - `state-coverage.md` — empty/loading/error/success states
   - `form-validation.md` — form patterns

### Step 3 — Design Token Integration

Each design system provides multiple formats:
- `tokens.css` — CSS custom properties, ready to import
- `design-tokens.json` — structured token data
- `tailwind-v4.css` — Tailwind v4 theme, ready for `@import`

Use these tokens directly in generated code — never hardcode colors/spacing.

### Step 4 — Component Reference

Each design system includes `components.html` with pre-built component examples. Read this file to understand the system's component patterns before building new ones.

## Anti-AI-Slop Rules

Always read `D:/open-design/craft/anti-ai-slop.md` before any UI generation. Key rules:
- No gradient abuse
- No excessive border-radius
- No card-soup layouts
- No orphaned accent colors
- At most 2 visible accent uses per screen

## Integration with Existing Skills

This skill is the **primary** UI development tool. When used by Gemini CLI in the tri-model orchestration workflow, this skill provides the design foundation for all frontend implementation work.
