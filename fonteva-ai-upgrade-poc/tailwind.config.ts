import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "#0f172a",
          hover: "#1e293b",
          active: "#334155",
          border: "rgba(255,255,255,0.06)",
          text: "#cbd5e1",
          muted: "#94a3b8",
        },
        brand: {
          50: "#eef4ff",
          100: "#d9e5ff",
          200: "#b6cbff",
          300: "#8babff",
          400: "#5a84ff",
          500: "#3260ff",
          600: "#1d47f0",
          700: "#1836c8",
          800: "#182f9f",
          900: "#182b7d",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "-apple-system", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.06)",
        card: "0 1px 3px 0 rgba(15,23,42,0.05), 0 1px 2px -1px rgba(15,23,42,0.04)",
        lift: "0 10px 24px -12px rgba(15,23,42,0.15), 0 4px 8px -4px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
