import type { NextConfig } from "next";
import os from "os";

// Discover all active LAN IP addresses to configure allowed dev origins for hot reloading (HMR) over Wi-Fi
const allowedOrigins: string[] = ["localhost", "127.0.0.1"];
const interfaces = os.networkInterfaces();

for (const name of Object.keys(interfaces)) {
  const iface = interfaces[name];
  if (iface) {
    for (const net of iface) {
      // Cast to any to handle type safety mismatch in different @types/node declarations
      const family = typeof (net as any).family === "string" ? (net as any).family : String((net as any).family);
      if ((family === "IPv4" || family === "4") && !net.internal) {
        allowedOrigins.push(net.address);
      }
    }
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: allowedOrigins
};

export default nextConfig;
