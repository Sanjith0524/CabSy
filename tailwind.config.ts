import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-primary-fixed-variant": "var(--color-on-primary-fixed-variant)",
        "error": "var(--color-error)",
        "tertiary-fixed": "var(--color-tertiary-fixed)",
        "on-tertiary-fixed": "var(--color-on-tertiary-fixed)",
        "primary": "var(--color-primary)",
        "primary-fixed-dim": "var(--color-primary-fixed-dim)",
        "on-secondary-container": "var(--color-on-secondary-container)",
        "primary-fixed": "var(--color-primary-fixed)",
        "on-tertiary-fixed-variant": "var(--color-on-tertiary-fixed-variant)",
        "on-background": "var(--color-on-background)",
        "on-primary-container": "var(--color-on-primary-container)",
        "surface-tint": "var(--color-surface-tint)",
        "on-tertiary-container": "var(--color-on-tertiary-container)",
        "secondary-fixed-dim": "var(--color-secondary-fixed-dim)",
        "on-secondary-fixed-variant": "var(--color-on-secondary-fixed-variant)",
        "on-secondary-fixed": "var(--color-on-secondary-fixed)",
        "on-tertiary": "var(--color-on-tertiary)",
        "secondary": "var(--color-secondary)",
        "surface-variant": "var(--color-surface-variant)",
        "on-error-container": "var(--color-on-error-container)",
        "surface-bright": "var(--color-surface-bright)",
        "tertiary-fixed-dim": "var(--color-tertiary-fixed-dim)",
        "on-surface": "var(--color-on-surface)",
        "error-container": "var(--color-error-container)",
        "outline-variant": "var(--color-outline-variant)",
        "on-surface-variant": "var(--color-on-surface-variant)",
        "inverse-surface": "var(--color-inverse-surface)",
        "on-primary-fixed": "var(--color-on-primary-fixed)",
        "on-secondary": "var(--color-on-secondary)",
        "surface": "var(--color-surface)",
        "background": "var(--color-background)",
        "surface-container-low": "var(--color-surface-container-low)",
        "surface-container-lowest": "var(--color-surface-container-lowest)",
        "tertiary": "var(--color-tertiary)",
        "surface-dim": "var(--color-surface-dim)",
        "secondary-fixed": "var(--color-secondary-fixed)",
        "primary-container": "var(--color-primary-container)",
        "outline": "var(--color-outline)",
        "inverse-on-surface": "var(--color-inverse-on-surface)",
        "on-error": "var(--color-on-error)",
        "surface-container": "var(--color-surface-container)",
        "inverse-primary": "var(--color-inverse-primary)",
        "tertiary-container": "var(--color-tertiary-container)",
        "on-primary": "var(--color-on-primary)",
        "surface-container-highest": "var(--color-surface-container-highest)",
        "secondary-container": "var(--color-secondary-container)",
        "surface-container-high": "var(--color-surface-container-high)"
      },
      borderRadius: {
        "DEFAULT": "0px",
        "lg": "0px",
        "xl": "0px",
        "full": "9999px"
      },
      fontSize: {
        "xs": ["0.8125rem", { lineHeight: "1.25rem" }],       // 13px
        "sm": ["0.9375rem", { lineHeight: "1.375rem" }],      // 15px
        "base": ["1.0625rem", { lineHeight: "1.5rem" }],      // 17px
        "lg": ["1.1875rem", { lineHeight: "1.625rem" }],      // 19px
        "xl": ["1.375rem", { lineHeight: "1.875rem" }],       // 22px
        "2xl": ["1.625rem", { lineHeight: "2.125rem" }],      // 26px
        "3xl": ["2.0rem", { lineHeight: "2.375rem" }],        // 32px
        "4xl": ["2.5rem", { lineHeight: "2.75rem" }],         // 40px
        "5xl": ["3.25rem", { lineHeight: "1" }],              // 52px
      },

      spacing: {
        "stack-sm": "16px",
        "stack-lg": "80px",
        "container-max": "1280px",
        "stack-md": "32px",
        "margin-mobile": "24px",
        "margin-desktop": "64px",
        "gutter": "32px",
        "unit": "8px"
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        display: ["var(--font-syne)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
