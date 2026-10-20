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
  theme: {
    extend: {
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
        }
      }
    }
  }
}
