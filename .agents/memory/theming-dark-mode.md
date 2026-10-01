---
name: Centralized dark-mode theming
description: Why dark mode is done via global .dark CSS overrides instead of per-element dark: variants, and how to extend it safely.
---

# Centralized `.dark` override theming

Keep the navigation and main page canvas visually continuous in both themes,
rather than giving the sidebar a separate background color.

**Why:** The user explicitly requested no color separation between the sidebar
and main page, with a white canvas in light mode and matching dark surfaces.

**How to apply:** Preserve that design constraint when adjusting theme palettes
or adding navigation surfaces; cards and active items may still have contrast.

Dark mode is class-based (`.dark` on `<html>`). Rather than sprinkling
`dark:` variants on every element, all dark styling lives in one place:
`app/globals.css` defines `.dark`-scoped overrides of the neutral Tailwind
utility classes (text/bg/border greys, etc.). Pages and components use the
normal light utilities and inherit dark automatically.

**Why:** keeps theming a single source of truth — new pages need zero
per-element `dark:` work, and the look stays consistent. The tradeoff is the
override rules must out-specify Tailwind: they rely on `.dark .x` specificity
beating Tailwind's `@layer utilities` (unlayered rules win over layered ones).

**How to apply:**
- To restyle for dark mode, edit the `.dark` overrides in `app/globals.css`;
  do NOT add `dark:` variants to individual components.
- If a new color/utility isn't going dark, add its `.dark`-scoped override
  there. Watch for specificity: a utility that itself lands in a layer may
  need an equally/greater-specific unlayered `.dark` rule.
- The pre-paint no-flash script (adds `dark` class from `localStorage.theme`
  before hydration) lives in `app/layout.tsx` via `next/script`
  `strategy="beforeInteractive"`, and `<html suppressHydrationWarning>` keeps
  the theme-class mutation from tripping React's hydration check.
