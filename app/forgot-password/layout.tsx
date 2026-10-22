import type { Metadata } from "next";
import type { ReactNode } from "react";

// page.tsx is a Client Component and can't export metadata, so it lives in this layout.
export const metadata: Metadata = {
  title: "Lupa Password",
  description: "Atur ulang password akun Agentra Anda dengan kode verifikasi yang dikirim ke email.",
  alternates: {
    canonical: "/forgot-password",
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

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
