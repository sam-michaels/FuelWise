/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#0e1014',
          soft: '#1a1d24',
          muted: '#2a2e38',
        },
        bone: {
          DEFAULT: '#f4f1ea',
          soft: '#ebe7dd',
        },
        signal: {
          DEFAULT: '#d94f30',
          soft: '#e87a5b',
        },
        gain: '#1f8a4c',
        loss: '#c43a3a',
      },
    },
  },
  plugins: [],
};
