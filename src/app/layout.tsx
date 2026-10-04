import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DotShade - Real-Time Dithering Studio",
  description: "Real-time dithering studio powered by WebGPU, WebGL, and CPU error-diffusion.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen" style={{ fontFamily: "'Courier New', Courier, monospace", imageRendering: "pixelated" }}>
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
