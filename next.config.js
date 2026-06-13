/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/splash", permanent: false },
    ];
  },
};

module.exports = nextConfig;
