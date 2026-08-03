module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Big Shoulders Display"', '"Arial Narrow"', "sans-serif"],
        body: ['"Archivo"', "system-ui", "sans-serif"],
        mono: ['"Spline Sans Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        odcBlack: "#080D18",  // navy pitch
        odcNavy: "#0F1728",   // panel
        odcPanel2: "#162034", // zebra
        odcCream: "#EDE8DC",  // bone
        odcRed: "#E63329",
        odcRedDeep: "#B8241C",
        odcGreen: "#1F8A5A",
        odcGreenBright: "#25A86D",
        odcGreenDeep: "#1B7F4E",
        odcGreenDark: "#0F1728",
        odcGold: "#D9B45B",
        odcGoldDeep: "#A8873C",
      },
      boxShadow: {
        glow: "0 1px 2px rgba(0,0,0,0.35)",
        cream: "0 1px 2px rgba(0,0,0,0.3)",
        green: "0 1px 2px rgba(0,0,0,0.35)",
        gold: "0 1px 2px rgba(0,0,0,0.3)",
        panel: "0 1px 2px rgba(0,0,0,0.3)",
        raised: "0 2px 6px rgba(0,0,0,0.35)",
        luxe: "0 1px 2px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};
