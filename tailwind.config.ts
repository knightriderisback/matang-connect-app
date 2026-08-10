import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "matang-navy": "#0a1628",
        "matang-gold": "#c9a227",
        "matang-cream": "#faf8f3",
        "matang-purple": "#4c1d95",
      },
    },
  },
  plugins: [],
};
export default config;
