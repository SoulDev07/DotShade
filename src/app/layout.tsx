import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dotshade.vercel.app";

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DotShade",
    template: "%s | DotShade",
  },
  description:
    "In-browser hardware-accelerated dithering for images, video, webcams, and procedural patterns. Powered by WebGPU via vgpu, WebGL2, and CPU error diffusion.",
  applicationName: "DotShade",
  keywords: [
    "dithering",
    "webgpu",
    "vgpu",
    "webgl",
    "webgl2",
    "bayer matrix",
    "ordered dithering",
    "error diffusion",
    "floyd steinberg",
    "atkinson dither",
    "halftone",
    "retro shaders",
    "pixel art generator",
    "1-bit",
    "game boy palette",
    "video dithering",
    "webcam shader",
  ],
  authors: [{ name: "DotShade" }],
  creator: "DotShade",
  publisher: "DotShade",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "DotShade",
    title: "DotShade | WebGPU & WebGL Dithering",
    description:
      "In-browser hardware-accelerated dithering for images, video, webcams, and procedural patterns. Powered by WebGPU via vgpu, WebGL2, and CPU error diffusion.",
    images: [
      {
        url: "/banner.svg",
        width: 850,
        height: 180,
        alt: "DotShade Dithering Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DotShade",
    description:
      "In-browser hardware-accelerated dithering for images, video, webcams, and procedural patterns.",
    images: ["/banner.svg"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "DotShade",
  url: siteUrl,
  description:
    "In-browser hardware-accelerated dithering tool for images, video, webcams, and procedural patterns.",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "All",
  browserRequirements: "Requires WebGPU, WebGL2, or HTML5 Canvas support",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "WebGPU WGSL acceleration via vgpu",
    "WebGL2 fragment shader fallback",
    "Multi-pass CPU error diffusion (Floyd-Steinberg, Atkinson, Sierra, Burkes, Stucki, Jarvis)",
    "Bayer ordered matrices (2x2, 4x4, 8x8, 16x16)",
    "Rotatable halftone dot screen and diagonal crosshatch",
    "Authentic vintage hardware palettes (Macintosh 1-bit, Game Boy, Commodore 64, CGA, PICO-8)",
    "Live webcam and video dithering",
    "Lossless PNG, WebP, WebM, and animated GIF export",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="bg-background text-foreground min-h-screen"
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          imageRendering: "pixelated",
        }}
      >
        {children}
        <Toaster
          theme="dark"
          position="bottom-left"
          closeButton
          toastOptions={{
            style: {
              background: "#000000",
              border: "1px solid #ffffff",
              color: "#ffffff",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "12px",
              borderRadius: "0",
              boxShadow: "3px 3px 0 rgba(255,255,255,0.25)",
            },
          }}
        />
      </body>
    </html>
  );
}
