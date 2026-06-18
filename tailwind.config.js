module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        odcBlack: "#050505",
        odcNavy: "#071723",
        odcCream: "#F8EBC6",
        odcRed: "#E51D2A",
        odcGreen: "#108A50",
        // richer supporting shades for depth
        odcNavyLight: "#0c2435",
        odcNavyDeep: "#040d15",
        odcGold: "#E8C766",
        odcGreenDeep: "#0a5e36",
        odcRedDeep: "#b01420",
      },
      boxShadow: {
        glow: "0 0 35px rgba(229,29,42,.24)",
        cream: "0 0 30px rgba(248,235,198,.12)",
        green: "0 0 30px rgba(16,138,80,.25)",
        // 3D raised-panel shadow: outer drop + soft, with subtle inner top highlight
        panel:
          "0 1px 0 rgba(248,235,198,.08) inset, 0 -1px 0 rgba(0,0,0,.4) inset, 0 18px 40px -12px rgba(0,0,0,.65), 0 4px 12px -4px rgba(0,0,0,.5)",
        // pressed/raised button
        raised:
          "0 1px 0 rgba(255,255,255,.18) inset, 0 -2px 6px rgba(0,0,0,.35) inset, 0 8px 20px -6px rgba(0,0,0,.55)",
        // luxe glow combining red + gold
        luxe: "0 0 40px -8px rgba(229,29,42,.35), 0 0 60px -20px rgba(232,199,102,.25)",
      },
      backgroundImage: {
        "luxe-radial":
          "radial-gradient(circle at 50% 0%, #0c2435 0%, #071723 38%, #040d15 72%, #020609 100%)",
        "panel-sheen":
          "linear-gradient(160deg, rgba(248,235,198,.07) 0%, rgba(248,235,198,.02) 22%, rgba(255,255,255,0) 60%)",
        "gold-line":
          "linear-gradient(90deg, transparent, rgba(232,199,102,.5), transparent)",
      },
    },
  },
  plugins: [],
};
