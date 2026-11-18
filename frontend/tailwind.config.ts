import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { forest: "#103D2B", leaf: "#39A96B", lime: "#B5D957", cream: "#F5F7F0", harvest: "#E6A23C", earth: "#7A5230", gold: "#C9A24A" },
    boxShadow: { soft: "0 14px 40px rgba(16, 61, 43, 0.10)" },
  }},
  plugins: [],
};
export default config;
