// Shared SEO constants for metadata, robots, sitemap, OG image and JSON-LD.
// Not a route file: Next.js only treats page/layout/route/metadata files in app/ as routes.

function resolveSiteUrl(): string {
  const fallback = "https://agentra.id";
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return fallback;
  try {
    // Normalise to an origin-style URL without a trailing slash.
    return new URL(raw).toString().replace(/\/+$/, "");
  } catch {
    return fallback;
  }
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "Agentra";
export const SUPPORT_EMAIL = "halo@agentra.id";

// Primary targets for the landing page: "CRM asuransi" + "aplikasi agen asuransi".
export const HOME_TITLE = "Aplikasi CRM Asuransi untuk Agen Indonesia | Agentra";
export const HOME_DESCRIPTION =
  "Aplikasi CRM asuransi untuk agen Indonesia. Kelola polis & nasabah, pengingat renewal jatuh tempo, notifikasi WhatsApp, dan pelacakan komisi. Coba gratis.";
