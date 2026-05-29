import type { NextConfig } from "next";

const appUrl = process.env.APP_URL ? new URL(process.env.APP_URL).hostname : null;
const devOrigins = ["localhost", "172.27.0.1"];
if (appUrl) devOrigins.push(appUrl);

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
