/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta FletIA
        ink: {
          DEFAULT: '#1a1714',
          2: '#4a4540',
          3: '#8a8278',
        },
        bg: '#f0ede8',
        surface: {
          DEFAULT: '#e8e3db',
          2: '#ddd8cf',
        },
        card: '#fff9f2',
        accent: {
          DEFAULT: '#d4440c',
          light: 'rgba(212, 68, 12, 0.08)',
        },
        success: '#1a6b3a',
        warning: '#c8860a',
        info: '#1a3d6b',
      },
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        sans: ['Barlow', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
