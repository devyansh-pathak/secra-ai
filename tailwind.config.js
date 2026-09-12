/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Mono', 'monospace'],
      },
      colors: {
        // ── AETHER reference palette ──────────────────────
        // Backgrounds
        bg:    '#0F110E',
        card:  '#1A1916',
        card2: '#222220',
        card3: '#2C2B27',
        card4: '#38352E',
        // Borders
        line:  '#3D3A30',
        line2: '#504C3F',
        // Amber / champagne accent
        amb: {
          DEFAULT: '#C89A5A',   // primary amber (button, active, highlight)
          lt:      '#DEB87A',   // lighter amber — large headings
          dk:      '#A07840',   // darker amber — pressed/hover
          dim:     '#7A5C30',   // very muted amber — subtle elements
          glow:    'rgba(200,154,90,0.18)',
        },
        // Text
        tx: {
          1: '#E8DCC8',   // primary — off-white champagne
          2: '#BFB49A',   // secondary — warm gray
          3: '#8C8070',   // muted — dim labels
          4: '#5C5448',   // very muted — placeholders
        },
      },
      boxShadow: {
        card:   '0 1px 4px rgba(0,0,0,0.5)',
        amb:    '0 0 16px rgba(200,154,90,0.2)',
        'amb-sm':'0 0 8px rgba(200,154,90,0.12)',
      },
    },
  },
  plugins: [],
}
