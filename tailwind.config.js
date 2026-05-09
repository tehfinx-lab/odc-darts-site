module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odcBlack: "#050505",
        odcNavy: "#071723",
        odcCream: "#F8EBC6",
        odcRed: "#E51D2A",
        odcGreen: "#108A50",
      },
      boxShadow: {
        glow: "0 0 35px rgba(229, 29, 42, 0.25)",
      },
    },
  },
  plugins: [],
};
