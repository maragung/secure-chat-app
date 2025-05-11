/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class', // or 'media'
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
        },
        colors: {
          // Light mode
          primary: {
            DEFAULT: 'rgb(var(--color-primary-light) / <alpha-value>)', // e.g., slate-900
            foreground: 'rgb(var(--color-primary-foreground-light) / <alpha-value>)', // e.g., white
          },
          secondary: {
            DEFAULT: 'rgb(var(--color-secondary-light) / <alpha-value>)', // e.g., slate-100
            foreground: 'rgb(var(--color-secondary-foreground-light) / <alpha-value>)', // e.g., slate-700
          },
          background: 'rgb(var(--color-background-light) / <alpha-value>)', // e.g., white
          foreground: 'rgb(var(--color-foreground-light) / <alpha-value>)', // e.g., slate-900
          border: 'rgb(var(--color-border-light) / <alpha-value>)', // e.g., slate-200
          card: 'rgb(var(--color-card-light) / <alpha-value>)', // e.g., white
          // Dark mode
          dark_primary: {
            DEFAULT: 'rgb(var(--color-primary-dark) / <alpha-value>)', // e.g., slate-50
            foreground: 'rgb(var(--color-primary-foreground-dark) / <alpha-value>)', // e.g., slate-900
          },
          dark_secondary: {
            DEFAULT: 'rgb(var(--color-secondary-dark) / <alpha-value>)', // e.g., slate-800
            foreground: 'rgb(var(--color-secondary-foreground-dark) / <alpha-value>)', // e.g., slate-300
          },
          dark_background: 'rgb(var(--color-background-dark) / <alpha-value>)', // e.g., slate-950
          dark_foreground: 'rgb(var(--color-foreground-dark) / <alpha-value>)', // e.g., slate-50
          dark_border: 'rgb(var(--color-border-dark) / <alpha-value>)', // e.g., slate-800
          dark_card: 'rgb(var(--color-card-dark) / <alpha-value>)', // e.g., slate-900
        },
        borderRadius: {
          lg: "0.75rem",
          md: "0.5rem",
          sm: "0.25rem",
        },
      },
    },
    plugins: [],
  };
  