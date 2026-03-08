import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        shellBg: "var(--color-bg)",
        shellSurface: "var(--color-surface)",
        shellInk: "var(--color-ink)",
        shellMuted: "var(--color-muted)",
        shellAccent: "var(--color-accent)",
      },
      fontFamily: {
        ui: ["var(--font-ui)"],
        display: ["var(--font-display)"],
      },
    },
  },
  plugins: [],
};

export default config;
