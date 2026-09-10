/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        clinical: {
          bg: "#0b0f19",
          surface: "#0f172a",
          card: "#131b2e",
          cardHover: "#1a243d",
          border: "rgba(255, 255, 255, 0.08)",
          accent: "#0ea5e9",
          accentCyan: "#06b6d4",
          accentTeal: "#14b8a6",
          accentEmerald: "#10b981",
          accentAmber: "#f59e0b",
          accentRose: "#f43f5e",
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif"
        ]
      }
    },
  },
  plugins: [],
}
