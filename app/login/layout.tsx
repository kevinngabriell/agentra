import type { Metadata } from "next";
import type { ReactNode } from "react";

// page.tsx is a Client Component and can't export metadata, so it lives in this layout.
export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun Agentra untuk mengelola polis, nasabah, renewal, dan komisi Anda.",
  alternates: {
    canonical: "/login",
  },
  // Utility page: keep it out of search results, but let crawlers follow its links.
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
