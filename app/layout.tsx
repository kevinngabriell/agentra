import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Provider } from "../components/ui/provider";
import { LanguageProvider } from "../contexts/language";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentra – CRM Asuransi Terbaik untuk Agen Indonesia",
  description:
    "Kelola polis, pantau renewal, kirim notifikasi WhatsApp, dan lihat komisi secara transparan dalam satu platform CRM asuransi yang aman.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Provider>
          <LanguageProvider>{children}</LanguageProvider>
        </Provider>
      </body>
    </html>
  );
}
