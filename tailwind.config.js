/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fairway: {
          50: '#F0F9F5',
          100: '#E8F4EF',
          200: '#D1EAE0',
          300: '#A3D5C1',
          400: '#5BAFA1',
          500: '#2A8F70',
          600: '#0F6B4F', // Primary Brand Green
          700: '#0B5741', // Primary Hover
          800: '#084332',
          900: '#052F23',
          950: '#021B14',
        },
        accent: {
          50: '#F5FCF0',
          100: '#EDF8E9',
          200: '#DAF2CF',
          300: '#BFE7AE',
          400: '#94D776',
          500: '#6BBF3E', // Accent Green
          600: '#56A12E',
          700: '#427F24',
          800: '#34641F',
          900: '#2C531C',
        },
        background: '#F7F9F8',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F1F4F2',
          card: '#FFFFFF',
        },
        foreground: {
          DEFAULT: '#16201B',
          muted: '#66736C',
          subtle: '#8C9B93',
        },
        border: {
          DEFAULT: '#DDE5E1',
          strong: '#C8D3CE',
          subtle: '#EAEFEA',
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
        button: '8px',
        input: '8px',
        card: '12px',
        panel: '16px',
      },
    },
  },
  plugins: [],
};
