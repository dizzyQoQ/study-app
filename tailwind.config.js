/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        moss: {
          50: "#f3f7f4",
          100: "#e2ebe4",
          700: "#1f4d3a",
          800: "#16382b",
          900: "#10261e",
        },
        gold: {
          400: "#e9b949",
          500: "#d4a017",
        },
        clay: {
          500: "#c45c26",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', "system-ui", "sans-serif"],
        display: ['"Zen Maru Gothic"', '"Fraunces"', "Georgia", "serif"],
        rounded: ['"Zen Maru Gothic"', '"Fredoka"', '"Noto Sans TC"', "sans-serif"],
      },
      keyframes: {
        "node-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.38)", opacity: "0.12" },
        },
        "node-wiggle": {
          "0%, 100%": { transform: "rotate(0deg) translateX(0)" },
          "20%": { transform: "rotate(-12deg) translateX(-4px)" },
          "40%": { transform: "rotate(12deg) translateX(4px)" },
          "60%": { transform: "rotate(-8deg) translateX(-2px)" },
          "80%": { transform: "rotate(8deg) translateX(2px)" },
        },
        "float-y": {
          "0%, 100%": { transform: "translate(-50%, 0)" },
          "50%": { transform: "translate(-50%, -8px)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.88)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "banner-float": {
          "0%, 100%": { transform: "translate(-50%, 0) rotate(-1.2deg)" },
          "50%": { transform: "translate(-50%, -5px) rotate(1deg)" },
        },
      },
      animation: {
        "node-pulse": "node-pulse 1.8s ease-in-out infinite",
        "node-wiggle": "node-wiggle 0.48s ease-in-out",
        "float-y": "float-y 1.35s ease-in-out infinite",
        "pop-in": "pop-in 0.22s cubic-bezier(0.34, 1.45, 0.64, 1)",
        "banner-float": "banner-float 3.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
