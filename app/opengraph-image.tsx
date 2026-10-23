import { ImageResponse } from "next/og";
import { SITE_URL } from "./seo";

// Root OG image: inherited by every route that doesn't define its own. Twitter/X reuses it
// automatically (Next copies openGraph images into twitter:image), so no twitter-image file.
export const alt = "Agentra – Aplikasi CRM Asuransi untuk Agen Indonesia";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const NAVY = "#1A3557";
const ACCENT = "#2E86C1";
const MUTED = "#D6E4F0";

export default function Image() {
  const host = new URL(SITE_URL).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NAVY,
          color: "white",
          padding: "72px 80px",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Agentra</div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>
            Aplikasi CRM Asuransi untuk Agen Indonesia
          </div>
          <div style={{ display: "flex", fontSize: 30, color: MUTED, lineHeight: 1.4, maxWidth: 940 }}>
            Kelola polis dan nasabah, pengingat renewal, notifikasi WhatsApp, dan komisi dalam satu platform.
          </div>
        </div>

        {/* Footer strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", width: 160, height: 8, borderRadius: 4, background: ACCENT }} />
          <div style={{ display: "flex", fontSize: 28, color: MUTED }}>{host}</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
