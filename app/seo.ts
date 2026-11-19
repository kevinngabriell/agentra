// Shared SEO constants for metadata, robots, sitemap, OG image and JSON-LD.
// Not a route file: Next.js only treats page/layout/route/metadata files in app/ as routes.

// Production domain. NEXT_PUBLIC_SITE_URL overrides it (e.g. for a staging build).
const DEFAULT_SITE_URL = "https://agentra.getmovira.com";

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  try {
    // Normalise to an origin-style URL without a trailing slash.
    return new URL(raw).toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "Agentra";

// Real, deliverable contact details (the old halo@agentra.id mailbox does not exist).
export const SUPPORT_EMAIL = "kevin@getmovira.com";
export const SUPPORT_WHATSAPP_E164 = "+628114411307";
export const SUPPORT_WHATSAPP_DISPLAY = "+62 811-4411-307";
export const SUPPORT_WHATSAPP_URL = "https://wa.me/628114411307";

// Agentra is built by Movira, a software house in Tangerang.
export const PARENT_NAME = "Movira";
export const PARENT_URL = "https://getmovira.com";

// Primary targets for the landing page: "CRM asuransi" as head term, "aplikasi agen asuransi",
// and a qualifier ("agen asuransi umum") so life-insurance agents are not attracted.
// Keep HOME_TITLE <= 60 characters and HOME_DESCRIPTION <= 160 characters.
export const HOME_TITLE = "Aplikasi CRM Asuransi untuk Agen Asuransi Umum | Agentra";
export const HOME_DESCRIPTION =
  "CRM asuransi untuk agen asuransi umum: kelola polis kebakaran, kendaraan, cargo, koasuransi, pengingat renewal via WhatsApp, dan komisi. Coba gratis.";
