import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.olx.ro" },
      { protocol: "https", hostname: "**.imobiliare.ro" },
      { protocol: "https", hostname: "**.imgimobiliare.ro" },
    ],
  },
};

export default nextConfig;
