import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Syne", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#1A3C5E",
          light: "#E8F1F9",
        },
        accent: {
          DEFAULT: "#FF6B35",
          light: "#FFF0EA",
        },
      },
    },
  },
  plugins: [],
};
export default config;
