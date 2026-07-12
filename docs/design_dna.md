# TransitOps Design DNA

This document outlines the core design language and aesthetic principles for the TransitOps platform.

## Design Philosophy

The aesthetic is inspired by modern, clean consumer applications (such as Airbnb).
- **Simplicity:** Content comes first. Unnecessary borders and heavy backgrounds are minimized.
- **Softness:** High border-radiuses on interactive elements and cards for a friendly, approachable feel.
- **High Contrast Typography:** Deep darks on clean whites (in light mode) to ensure perfect legibility.
- **Dynamic Themes:** First-class support for both Light and Dark modes.

## Color Palette

The theme uses semantic CSS variables mapped to the core palette, ensuring that toggling between Light and Dark mode requires zero changes to the markup.

### Core Brand
- **Brand Primary:** `#ff385c` (Rose Red) — Used for primary actions, active states, and focus rings.
- **Brand Hover:** `#e31c5f`

### Semantic Backgrounds
- **`var(--bg-primary)`**: The main application canvas.
  - Light: `#ffffff`
  - Dark: `#0f172a`
- **`var(--bg-secondary)`**: Panels, cards, and modal backgrounds.
  - Light: `#f7f7f9`
  - Dark: `#1e293b`

### Typography
- **`var(--text-primary)`**: Headers and main body text.
  - Light: `#222222`
  - Dark: `#f8fafc`
- **`var(--text-secondary)`**: Subtitles, muted text, and input labels.
  - Light: `#717171`
  - Dark: `#94a3b8`

### UI Elements
- **`var(--border-color)`**: Dividers, faint borders.
  - Light: `#ebebeb`
  - Dark: `#334155`
- **Radius**: `var(--radius)` (set to `0.75rem`)

### Highlights and Active States
- **Active Navigation/Tabs**: Use `bg-[var(--brand-color)]/10 text-[var(--brand-color)] font-semibold` to create the signature red highlight.
- **Dark Mode Strategy**: The application uses the `dark` class on the `<html>` element. This class is toggled via the TopBar and persisted in `localStorage` under the key `theme`. All components automatically adapt by relying strictly on the CSS variables.

### Status Colors
- **Available/Success:** `#00a699` (Teal)
- **On Trip/Active:** `#ff385c`
- **In Shop/Warning:** `#ffb400`
- **Retired/Muted:** `#717171`

## Implementation Guidelines

When building UI components, **never hardcode Tailwind colors (like `bg-slate-900` or `text-gray-500`)**. Instead, use the semantic variables wrapped in arbitrary Tailwind values:

| Don't use                 | Do use                                    |
|---------------------------|-------------------------------------------|
| `bg-slate-900`            | `bg-[var(--bg-secondary)]`                |
| `bg-slate-950`            | `bg-[var(--bg-primary)]`                  |
| `text-white`              | `text-[var(--text-primary)]`              |
| `text-slate-400`          | `text-[var(--text-secondary)]`            |
| `border-slate-800`        | `border-[var(--border-color)]`            |
| `bg-blue-600`             | `bg-[var(--brand-color)]`                 |
| `rounded-lg`              | `rounded-[var(--radius)]`                 |

By following these mappings, components automatically adapt to dark mode and global brand color changes.
