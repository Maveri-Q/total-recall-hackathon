import type { Metadata, Viewport } from "next";
import { Archivo, Schibsted_Grotesk } from "next/font/google";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import "./globals.css";

// Archivo for titles and numbers, Schibsted Grotesk for everything you read (UI.md).
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["600", "700", "800"], display: "swap" });
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: { title: APP_NAME, description: APP_DESCRIPTION, siteName: APP_NAME, type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0A1712",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${schibsted.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
