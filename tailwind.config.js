module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Sofia Sans Extra Condensed"', '"Arial Narrow"', "sans-serif"],
        body: ['"Sofia Sans"', "system-ui", "sans-serif"],
        mono: ['"Sofia Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        // Floodlit Cream - same palette as the bot's images
        odcBlack: "#030C08",   // background
        odcNavy: "#0A1C14",    // panels
        odcPanel2: "#0F241A",  // zebra rows
        odcCream: "#FFFFFF",   // text
        odcAcc: "#EBD7AA",     // cream accent (buttons, highlights, leaders)
        odcAccDeep: "#CDB27A",
        odcOnAcc: "#030C08",   // text on cream
        odcLoss: "#FF3B30",    // losses, relegation, errors, live
        odcSponsor: "#FFD60A", // BarSport yellow
        odcRed: "#FF3B30",
        odcRedDeep: "#D92D23",
        odcGreen: "#12B76A",   // wins, promotion
        odcGreenBright: "#2FD38A",
        odcGreenDeep: "#0E8A50",
        odcGreenDark: "#0A1C14",
        odcGold: "#EBD7AA",
        odcGoldDeep: "#CDB27A",
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
