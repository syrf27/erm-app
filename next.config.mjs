/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_BASE_URL || "https://mr.pusdiklat.com" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization,x-csrf-token" },
        ],
      },
    ];
  },
};

export default nextConfig;
