/** @type {import('tailwindcss').Config} */

// Every colour resolves through a CSS variable defined in src/index.css, so the
// light/dark swap happens by flipping one class on <html> — no `dark:` variant
// on any component. Values are space-separated RGB channels so Tailwind's
// opacity modifiers (bg-black/40, ring-brand-primary/50) still work.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: token('brand-primary'),
          accent: token('brand-accent'),
        },
        surface: {
          page: token('surface-page'),
          card: token('surface-card'),
          chrome: token('surface-chrome'),
          sunken: token('surface-sunken'),
          'sunken-alt': token('surface-sunken-alt'),
          list: token('surface-list'),
          pill: token('surface-pill'),
        },
        text: {
          primary: token('text-primary'),
          muted: token('text-muted'),
        },
        // Hairline borders — DESIGN.md §4's 1px card edge.
        line: token('line'),
        // Text that sits on a coloured fill, and so must not invert with the theme.
        ink: token('ink'),
        type: {
          feature: token('type-feature'),
          bug: token('type-bug'),
        },
        status: {
          todo: token('status-todo'),
          progress: token('status-progress'),
          review: token('status-review'),
          done: token('status-done'),
        },
        due: {
          safe: token('due-safe'),
          warning: token('due-warning'),
          overdue: token('due-overdue'),
        },
      },
    },
  },
};
