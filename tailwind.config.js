/** @type {import('tailwindcss').Config} */
// export default {
//   content: ['./index.html', './src/**/*.{js,jsx}'],
//   theme: {
//     extend: {
//       colors: {
//         // Tweak in M6 (tag-style) and M8 (due-tint)
//         feature: '#10B981', // emerald
//         bug: '#DC2626',     // crimson
//       },
//     },
//   },
//   plugins: [],
// };

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#007AFF',
          accent: '#FF2D55',
        },
        surface: {
          page: '#E5E5EA', // Darkened slightly
          card: '#F5F5F7', // The new "white"
        },
        text: {
          primary: '#1D1D1F',
          muted: '#86868B',
        },
        type: {
          feature: '#34C759',
          bug: '#FF9500',
        },
        // DESIGN.md §2 due states. `due-neutral` is omitted on purpose — it is
        // #86868B, the same value as text-muted, which Done cards already use.
        due: {
          safe: '#34C759',
          warning: '#FFCC00',
          overdue: '#FF3B30',
        }
      }
    }
  }
}
