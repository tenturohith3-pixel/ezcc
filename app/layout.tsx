import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EffectCraft — Cinematic Post-Production Platform",
    template: "%s — EffectCraft",
  },
  description:
    "Studio-grade color grading and a premium Prism plugin ecosystem, right in the browser. Grade, effect, deliver.",
  applicationName: "EffectCraft",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0908" },
    { media: "(prefers-color-scheme: light)", color: "#f3eee4" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${serif.variable} ${mono.variable}`}
    >
      <body className="bg-bg text-ink min-h-screen antialiased">
        {/* appearance boots before first paint — never flash the wrong room */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <SmoothScroll>
          <ScrollProgress />
          <Nav />
          {children}
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
