import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dither Studio — Personal Real-time Dithering Engine",
  description:
    "A local-first, GPU-accelerated dithering utility for images, videos, and live webcam streams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-neutral-950 text-neutral-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
