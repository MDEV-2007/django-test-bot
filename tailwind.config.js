/** @type {import('tailwindcss').Config} */
// Replaces the CDN Play script's inline `tailwind.config = {...}` — there were TWO of
// these before (templates/base.html for the main site, templates/panel/base_admin.html
// for the Super Admin / Teacher panels), now merged into this one shared config compiled
// ahead of time. See package.json's build:css / watch:css and README's "Frontend build".
module.exports = {
  content: [
    './templates/**/*.html',
    './static/js/**/*.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#050811',
          blue: '#2d6cff',
          royal: '#37b7ff',
          gold: '#f7c948',
          emerald: '#10b981',
          rose: '#ef4444',
        },
        // Panel/teacher admin theme's neutral scale (templates/panel/base_admin.html).
        ink: {
          900: '#0f1729',
          700: '#334155',
          500: '#64748b',
          300: '#cbd5e1',
          100: '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
