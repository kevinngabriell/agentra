import type { Metadata } from "next";
import type { ReactNode } from "react";

// page.tsx is a Client Component and can't export metadata, so it lives in this layout.
// Indexable conversion page. The canonical drops ?plan=... so plan-specific links from the
// pricing section consolidate onto one URL.
export const metadata: Metadata = {
  title: "Daftar Gratis – Mulai Kelola Polis & Nasabah",
  description:
    "Buat akun Agentra gratis dalam hitungan menit. Kelola polis dan nasabah, aktifkan pengingat renewal, dan kirim notifikasi WhatsApp dari satu dasbor.",
  alternates: {
    canonical: "/register",
  },
};

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
