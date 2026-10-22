import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Provider } from "../components/ui/provider";
import { LanguageProvider } from "../contexts/language";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, SITE_URL } from "./seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: "%s | Agentra",
  },
  description: HOME_DESCRIPTION,
  keywords: [
    "CRM asuransi",
    "aplikasi agen asuransi",
    "aplikasi CRM agen asuransi",
    "software agen asuransi",
    "pengingat renewal polis",
    "pengingat jatuh tempo polis",
    "manajemen polis asuransi",
    "notifikasi WhatsApp nasabah",
    "komisi agen asuransi",
    "manajemen sub-agen",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "business",
  // Every public page overrides this with its own canonical. Do not rely on it for new pages.
  alternates: {
    canonical: "/",
  },
  // No title/description/url here on purpose: Next fills og:title/og:description from each
  // page's own title/description, and a root og:url would leak "/" onto every child page.
  // Children must not set `openGraph` themselves, or they drop the root opengraph-image
  // (nested metadata objects are replaced, not merged).
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: SITE_NAME,
  },
  // Title, description and image are inherited from the page metadata / opengraph-image.
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A3557",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <Provider>
          <LanguageProvider>{children}</LanguageProvider>
        </Provider>
      </body>
    </html>
  );
}
