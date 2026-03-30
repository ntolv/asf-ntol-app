import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ASF-NTOL",
    short_name: "ASF-NTOL",
    description: "Application officielle de gestion associative, tontine et enchères ASF-NTOL.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f0fdf4",
    theme_color: "#16a34a",
    orientation: "portrait",
    lang: "fr",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/app-icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/app-icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/app-icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}