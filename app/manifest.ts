import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leora",
    short_name: "Leora",
    description: "Personal AI agents that brief you by voice.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FBFAF7",
    theme_color: "#131519",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
