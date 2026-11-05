import type { Metadata } from "next";
import "./globals.css";
import { Space_Grotesk, Poppins, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

const headingFont = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-heading" });
const bodyFont = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-body" });
const extraFont = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-extra" });

export const metadata: Metadata = {
  title: "EUPHORIA PANEL — Premium Hosting Dashboard",
  description: "Claim and manage your hosting servers.",
  icons: {
    icon: "/api/branding/favicon",
    shortcut: "/api/branding/favicon",
    apple: "/api/branding/favicon",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable} ${extraFont.variable}`}>
      <body>
        <div className="dash0-bg-gradient" aria-hidden="true" />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
