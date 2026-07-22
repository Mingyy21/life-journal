import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0fdf9",
          100: "#ccfbef",
          200: "#99f6de",
          300: "#5feacb",
          400: "#2dd4b3",
          500: "#14b89a",
          600: "#0d9480",
          700: "#0f7668",
          800: "#115e54",
          900: "#134e46",
        },
        warm: {
          50: "#fefdfb",
          100: "#fdf9f0",
          200: "#faf0dc",
          300: "#f5e3c0",
          400: "#efd3a0",
          500: "#e7be7a",
          600: "#dba558",
          700: "#c48a3f",
          800: "#a37033",
          900: "#855c2d",
        },
        calm: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      fontFamily: {
        serif: ["Noto Serif SC", "Source Han Serif SC", "SimSun", "serif"],
        sans: ["Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.4s ease-out backwards",
        "scale-in": "scaleIn 0.2s ease-out backwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      typography: {
        "calm": {
          css: {
            "--tw-prose-body": "var(--color-calm-700)",
            "--tw-prose-headings": "var(--color-calm-900)",
            "--tw-prose-links": "var(--color-primary-600)",
            "--tw-prose-bold": "var(--color-calm-900)",
            "--tw-prose-quotes": "var(--color-calm-600)",
            "--tw-prose-code": "var(--color-calm-800)",
            "--tw-prose-hr": "var(--color-calm-200)",
            "--tw-prose-th-borders": "var(--color-calm-300)",
          },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.06), 0 1px 3px 0 rgb(0 0 0 / 0.04)',
        'popup': '0 10px 25px -5px rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
