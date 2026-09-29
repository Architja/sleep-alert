/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neural-void': '#09090b',
        'neural-deep': '#18181b',
        'holo-white': '#f8fafc',
        'cyan-glow': '#00f0ff',
        'cyan-dim': '#00f0ff40',
        'purple-neon': '#a855f7',
        'alert-amber': '#f59e0b',
        'alert-red': '#ef4444',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
