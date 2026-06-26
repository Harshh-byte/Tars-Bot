/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', "sans-serif"],
        body: ['"Space Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        ds: {
          bg: "var(--bg-color)",
          text: "var(--text-color)",
          muted: "var(--text-muted)",
          border: "var(--border-color)",
          card: "var(--card-bg)",
          blurple: "#5865F2",
          green: "#57F287",
          yellow: "#FEE75C",
          fuchsia: "#EB459E",
          red: "#ED4245",
        }
      }
    },
  },
  plugins: [],
}
