module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        odcBlack: "#020d08",
        odcNavy: "#063d24",
        odcCream: "#F8EBC6",
        odcRed: "#E51D2A",
        odcGreen: "#16C46C",
        // emerald luxury palette
        odcGreenBright: "#22d97a",
        odcGreenDeep: "#0c8f4c",
        odcGreenDark: "#063d24",
        odcGold: "#E8C766",
        odcGoldDeep: "#a8852f",
      },
      boxShadow: {
        glow: "0 0 35px rgba(22,196,108,.3)",
        cream: "0 0 30px rgba(248,235,198,.12)",
        green: "0 0 35px rgba(22,196,108,.4)",
        gold: "0 0 30px rgba(232,199,102,.25)",
        panel:
          "0 1px 0 rgba(248,235,198,.08) inset, 0 -1px 0 rgba(0,0,0,.4) inset, 0 18px 40px -12px rgba(0,0,0,.65), 0 4px 12px -4px rgba(0,0,0,.5)",
        raised:
          "0 1px 0 rgba(255,255,255,.3) inset, 0 -2px 6px rgba(0,0,0,.2) inset, 0 10px 28px -6px rgba(22,196,108,.4)",
        luxe: "0 0 40px -8px rgba(22,196,108,.4), 0 0 60px -20px rgba(232,199,102,.25)",
      },
    },
  },
  plugins: [],
};
