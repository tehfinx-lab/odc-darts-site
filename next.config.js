/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/splash", permanent: false, missing: [{ type: "query", key: "from" }] },
    ];
  },
};
module.exports = nextConfig;
