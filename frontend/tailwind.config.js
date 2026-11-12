/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-paper)",
        foreground: "var(--color-ink)",
        paper: {
          DEFAULT: "var(--color-paper)",
          2: "var(--color-paper-2)",
          3: "var(--color-paper-3)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          2: "var(--color-ink-2)",
          muted: "var(--color-muted)",
        },
        rule: "var(--color-rule)",
        border: "var(--color-rule)",
        input: "var(--color-paper-2)",
        well: {
          DEFAULT: "var(--color-well)",
          2: "var(--color-well-2)",
          ink: "var(--color-well-ink)",
          muted: "var(--color-well-muted)",
          rule: "var(--color-well-rule)",
          card: "var(--color-card)",
        },
        primary: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-ink)",
        },
        secondary: {
          DEFAULT: "var(--color-paper-2)",
          foreground: "var(--color-ink)",
        },
        muted: {
          DEFAULT: "var(--color-paper-2)",
          foreground: "var(--color-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hi: "var(--color-accent-hi)",
          deep: "var(--color-accent-deep)",
          soft: "var(--color-accent-soft)",
          foreground: "var(--color-accent-ink)",
          apricot: "var(--color-accent-2)",
        },
        card: {
          DEFAULT: "var(--color-paper-2)",
          foreground: "var(--color-ink)",
        },
      },
      fontFamily: {
        sans: ['"Wix Madefor Text"', "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ['"Wix Madefor Display"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-5px)" },
          "80%": { transform: "translateX(5px)" },
        },
      },
      animation: {
        shake: "shake 0.5s ease both",
      },
    },
  },
  plugins: [],
};
