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
        odcBlack: "#0A1710",  // pitch
        odcNavy: "#0F1F16",   // panel
        odcPanel2: "#13251B", // zebra
        odcCream: "#E9EFE7",  // bone
        odcRed: "#E63329",
        odcRedDeep: "#C2281F",
        odcGreen: "#23A566",
        odcGreenBright: "#2BBF77",
        odcGreenDeep: "#1B7F4E",
        odcGreenDark: "#0F1F16",
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
