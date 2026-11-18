import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { forest: "#174B35", leaf: "#2F7D4B", cream: "#F7F8F2", harvest: "#E6A23C", earth: "#7A5230", gold: "#C9A24A" },
    boxShadow: { soft: "0 12px 36px rgba(23, 75, 53, 0.08)" },
  }},
  plugins: [],
};
export default config;
