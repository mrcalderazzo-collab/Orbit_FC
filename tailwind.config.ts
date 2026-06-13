import type { Config } from "tailwindcss";

/**
 * Orbit FC theme bridge.
 * All chrome colors are CSS variables (see src/index.css) so the three
 * themes — Dark / Light / Clear — swap with a single `data-theme` attribute.
 * Semantic status colors stay constant across themes.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "var(--surface-0)",
        panel: "var(--panel)",
        "panel-solid": "var(--panel-solid)",
        sidebar: "var(--sidebar-bg)",
        scrim: "var(--scrim)",
        "code-bg": "var(--code-bg)",
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
          5: "var(--ink-5)",
        },
        hair: {
          DEFAULT: "var(--hair)",
          2: "var(--hair-2)",
          3: "var(--hair-3)",
          strong: "var(--hair-strong)",
        },
        fill: {
          1: "var(--fill-1)",
          2: "var(--fill-2)",
          3: "var(--fill-3)",
        },
        acc: {
          DEFAULT: "var(--acc)",
          text: "var(--acc-text)",
          deep: "var(--acc-deep)",
        },
        "on-accent": "var(--on-accent)",
        // semantic status — constant across themes
        ok: "#22c55e",
        info: "#3b82f6",
        warn: "#f59e0b",
        bad: "#ef4444",
        gov: "#a855f7",
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        pill: "99px",
      },
      keyframes: {
        "orbit-fade": { from: { opacity: "0" }, to: { opacity: "1" } },
        "orbit-pop": {
          from: { opacity: "0", transform: "translateY(14px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        "orbit-toast": {
          from: { opacity: "0", transform: "translate(-50%, 16px)" },
          to: { opacity: "1", transform: "translate(-50%, 0)" },
        },
      },
      animation: {
        fade: "orbit-fade .2s ease",
        pop: "orbit-pop .22s cubic-bezier(.2,.8,.3,1)",
        toast: "orbit-toast .25s cubic-bezier(.2,.8,.3,1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
