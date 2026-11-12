# Design: Pearson Specter Litt (LFMS Enterprise)

The locked multi-page system for PSL Enterprise Legal Cloud. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

## System
- Genre: modern-minimal
- Shape of the first page: Conversational FAQ with Dusk Stage hero
- Theme: Dusk (deal 2/3 · `dusk: fog/periwinkle-apricot/glass`)
- Axes: dark/grotesk-sans/cool · posture: committed

## Tokens
`frontend/src/tokens.css` is the source of truth. Core roles:
```css
:root {
  --color-paper: oklch(17.5% 0.014 268);
  --color-paper-2: oklch(21% 0.016 268);
  --color-paper-3: oklch(25% 0.017 268);
  --color-ink: oklch(96% 0.006 75);
  --color-ink-2: oklch(85% 0.010 262);
  --color-muted: oklch(70% 0.016 262);
  --color-rule: oklch(30% 0.016 266);
  --color-accent: oklch(77% 0.10 274);
  --color-accent-ink: oklch(19% 0.035 274);
  --color-accent-hi: oklch(84% 0.085 274);
  --color-accent-2: oklch(83% 0.095 62);
  --color-focus: oklch(80% 0.10 274);
  --color-well: oklch(95.5% 0.008 75);
  --color-well-ink: oklch(21% 0.016 268);
  --color-card: oklch(99.5% 0.003 75);
  --font-display: "Wix Madefor Display", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Wix Madefor Text", ui-sans-serif, system-ui, sans-serif;
  --radius-card: 18px;
  --radius-inner: 10px;
  --radius-pill: 999px;
  --rule-hair: 1px;
}
```
Spacing scale, type scale, easings, durations, and semantic role tokens live in `frontend/src/tokens.css`.

## Controls
- Primary: `--color-accent` fill (`#periwinkle` in OKLCH), `--color-accent-ink` label, `--radius-pill`, `48px` on marketing pages (`36px`–`40px` in dense app toolbars)
- Secondary: transparent fill, `1px solid var(--color-rule)` hairline, `--color-ink` label, matching radius and height
- Focus: instant `2px solid var(--color-focus)` outline with `2px` offset

## Motion
- Character: calm; transform and opacity only; explicit property lists (never `transition: all`); `prefers-reduced-motion: reduce` stops all motion at once.

## Exports
`frontend/src/tokens.css`, `frontend/src/base.css`, `frontend/src/index.css`, and `frontend/tailwind.config.js`.

