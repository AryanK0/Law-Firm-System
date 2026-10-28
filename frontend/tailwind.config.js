/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-base)",
        foreground: "var(--text-primary)",
        border:     "var(--border-glass)",
        input:      "var(--bg-elevated)",
        primary: {
          DEFAULT:    "var(--accent-primary)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT:    "var(--accent-secondary)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT:    "#1e293b",
          foreground: "var(--text-secondary)",
        },
        accent: {
          DEFAULT:    "var(--accent-primary)",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT:    "var(--bg-glass)",
          foreground: "var(--text-primary)",
        },
      },
      fontFamily: {
        sans:    ['"Inter"', '"Segoe UI"', "sans-serif"],
        heading: ['"Outfit"', '"Inter"', "sans-serif"],
        mono:    ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%":      { transform: "translateX(-8px)" },
          "40%":      { transform: "translateX(8px)" },
          "60%":      { transform: "translateX(-5px)" },
          "80%":      { transform: "translateX(5px)" },
        },
      },
      animation: {
        shake: "shake 0.5s ease both",
      },
    },
  },
  plugins: [],
};
