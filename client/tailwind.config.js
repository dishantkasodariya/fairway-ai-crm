export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fairway: {
          50: 'var(--fw-50, #F0F9F5)',
          100: 'var(--fw-100, #E8F4EF)',
          200: 'var(--fw-200, #D1EAE0)',
          300: 'var(--fw-300, #A3D5C1)',
          400: 'var(--fw-400, #5BAFA1)',
          500: 'var(--fw-500, #2A8F70)',
          600: 'var(--fw-600, #0F6B4F)', // Primary Brand
          700: 'var(--fw-700, #0B5741)', // Primary Hover
          800: 'var(--fw-800, #084332)',
          900: 'var(--fw-900, #052F23)',
          950: 'var(--fw-950, #021B14)',
        },
        accent: {
          50: 'var(--accent-50, #F5FCF0)',
          100: 'var(--accent-100, #EDF8E9)',
          200: 'var(--accent-200, #DAF2CF)',
          300: 'var(--accent-300, #BFE7AE)',
          400: 'var(--accent-400, #94D776)',
          500: 'var(--accent-500, #6BBF3E)', // Accent
          600: 'var(--accent-600, #56A12E)',
          700: 'var(--accent-700, #427F24)',
          800: 'var(--accent-800, #34641F)',
          900: 'var(--accent-900, #2C531C)',
        },
        background: 'var(--bg-app, #F7F9F8)',
        surface: {
          DEFAULT: 'var(--bg-surface, #FFFFFF)',
          muted: 'var(--bg-surface-muted, #F1F4F2)',
          card: 'var(--bg-card, #FFFFFF)',
        },
        popover: {
          DEFAULT: 'var(--bg-surface, #FFFFFF)',
          foreground: 'var(--text-foreground, #16201B)',
        },
        card: {
          DEFAULT: 'var(--bg-card, #FFFFFF)',
          foreground: 'var(--text-foreground, #16201B)',
        },
        muted: {
          DEFAULT: 'var(--bg-surface-muted, #F1F4F2)',
          foreground: 'var(--text-muted, #66736C)',
        },
        foreground: {
          DEFAULT: 'var(--text-foreground, #16201B)',
          muted: 'var(--text-muted, #66736C)',
          subtle: 'var(--text-subtle, #8C9B93)',
        },
        border: {
          DEFAULT: 'var(--border-color, #DDE5E1)',
          strong: 'var(--border-strong, #C8D3CE)',
          subtle: 'var(--border-subtle, #EAEFEA)',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(15, 23, 42, 0.04)',
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        popover: '0 8px 24px rgba(15, 23, 42, 0.10)',
        dialog: '0 20px 60px rgba(15, 23, 42, 0.14)',
      },
      borderRadius: {
        none: '0px',
        sm: 'calc(var(--radius, 8px) * 0.5)',
        DEFAULT: 'calc(var(--radius, 8px) * 0.75)',
        md: 'calc(var(--radius, 8px) * 0.85)',
        lg: 'var(--radius, 8px)',
        xl: 'calc(var(--radius, 8px) * 1.25)',
        '2xl': 'calc(var(--radius, 8px) * 1.5)',
        '3xl': 'calc(var(--radius, 8px) * 2)',
        full: '9999px',
        button: 'var(--radius-button, var(--radius, 8px))',
        input: 'var(--radius-input, var(--radius, 8px))',
        card: 'var(--radius-card, calc(var(--radius, 8px) + 4px))',
        panel: 'var(--radius-panel, calc(var(--radius, 8px) + 8px))',
      },
    },
  },
  plugins: [],
};
