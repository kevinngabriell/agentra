import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE_URL } from "./seo";

// Root OG image: inherited by every route that doesn't define its own. Twitter/X reuses it
// automatically (Next copies openGraph images into twitter:image), so no twitter-image file.
export const alt = "Agentra – Aplikasi CRM Asuransi untuk Agen Asuransi Umum";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const NAVY = "#0D1B3E";
const ACCENT = "#3B82F6";
const MUTED = "#C7D6F2";

export default async function Image() {
  const host = new URL(SITE_URL).host;
  // Official white logo, inlined as a data URI so the OG renderer needs no network or font access.
  const svg = await readFile(path.join(process.cwd(), "public/brand/agentra-logo-horizontal-white.svg"), "utf8");
  const logo = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

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
        {/* Logo */}
        <img src={logo} width={246} height={72} alt="" />

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>
            Aplikasi CRM Asuransi untuk Agen Asuransi Umum
          </div>
          <div style={{ display: "flex", fontSize: 30, color: MUTED, lineHeight: 1.4, maxWidth: 940 }}>
            Polis, koasuransi, pengingat renewal via WhatsApp, dan komisi dalam satu tempat.
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
