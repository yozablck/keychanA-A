import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Keychan",
  description: "Create custom 3D printable keychains from your 2D images. Upload your logo or design, customize it, and generate STL files ready for 3D printing. Simple, fast, and professional.",
  keywords: ["3D keychain", "3D printing", "STL generator", "custom keychain", "3D model", "keychain design", "3D printable"],
  authors: [{ name: "KEYCHAN" }],
  creator: "KEYCHAN",
  publisher: "KEYCHAN",
  metadataBase: new URL("https://keychan.studio"),
  openGraph: {
    title: "KEYCHAN - Transform 2D Images into 3D Printable Keychains",
    description: "Create custom 3D printable keychains from your 2D images. Upload your logo or design, customize it, and generate STL files ready for 3D printing.",
    url: "https://keychan.studio",
    siteName: "KEYCHAN",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "KEYCHAN Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KEYCHAN - Transform 2D Images into 3D Printable Keychains",
    description: "Create custom 3D printable keychains from your 2D images.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConvexClientProvider>
          <TooltipProvider>
            <div className="flex flex-col min-h-screen">
              {children}
              <Footer />
            </div>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

