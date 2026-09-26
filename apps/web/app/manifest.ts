import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keepsake",
    short_name: "Keepsake",
    description:
      "A personal library for things worth revisiting. Save links, notes, images, and PDFs, then find them when you need them.",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/logo-16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/icons/logo-48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/icons/logo-128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/icons/logo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "3840x2307",
        type: "image/png",
        form_factor: "wide",
        label: "Your saved library on desktop",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "692x1498",
        type: "image/png",
        form_factor: "narrow",
        label: "Your saved library on mobile",
      },
    ],
  };
}
