import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import TermsGuard from "@/components/TermsGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoSwap | Sustainable Local Sharing",
  description: "Exchange, borrow, or share used items within your local community to reduce waste and promote sustainable consumption.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LanguageProvider>
          <ThemeProvider>
            <Header />
            <TermsGuard>
              {children}
            </TermsGuard>
            <Footer />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
