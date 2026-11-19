import { getPlans, type Plan } from "@/lib/plans/plans"
import {
  HOME_DESCRIPTION,
  PARENT_NAME,
  PARENT_URL,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_E164,
  SUPPORT_WHATSAPP_URL,
} from "@/app/seo"
import { FAQ_ITEMS } from "@/components/FaqSection"

// Server Component: renders schema.org JSON-LD for the landing page.
// Offers come from the same plans API the pricing section uses; if it is unavailable the
// offers are simply omitted rather than guessed.

const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`
const SOFTWARE_ID = `${SITE_URL}/#software`

// UN/CEFACT unit codes used by schema.org UnitPriceSpecification.
function billingUnitCode(billingCycle: string): string | undefined {
  if (billingCycle === "monthly") return "MON"
  if (billingCycle === "yearly") return "ANN"
  return undefined
}

function planToOffer(plan: Plan) {
  const price = String(plan.price_idr || 0)
  const unitCode = plan.price_idr ? billingUnitCode(plan.billing_cycle) : undefined

  return {
    "@type": "Offer",
    name: plan.name,
    ...(plan.tagline ? { description: plan.tagline } : {}),
    price,
    priceCurrency: "IDR",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/register?plan=${encodeURIComponent(plan.plan_id)}`,
    ...(unitCode
      ? {
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price,
            priceCurrency: "IDR",
            unitCode,
          },
        }
      : {}),
  }
}

export async function StructuredData() {
  const plans = await getPlans()
  const offers = plans.map(planToOffer)

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
        email: SUPPORT_EMAIL,
        telephone: SUPPORT_WHATSAPP_E164,
        // Agentra is a product of Movira.
        parentOrganization: {
          "@type": "Organization",
          name: PARENT_NAME,
          url: PARENT_URL,
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: SUPPORT_EMAIL,
            availableLanguage: ["Indonesian"],
            areaServed: "ID",
          },
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            telephone: SUPPORT_WHATSAPP_E164,
            url: SUPPORT_WHATSAPP_URL,
            availableLanguage: ["Indonesian"],
            areaServed: "ID",
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "id-ID",
        publisher: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "SoftwareApplication",
        "@id": SOFTWARE_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: HOME_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "id-ID",
        publisher: { "@id": ORGANIZATION_ID },
        brand: { "@type": "Brand", name: PARENT_NAME, url: PARENT_URL },
        audience: {
          "@type": "Audience",
          audienceType: "Agen asuransi umum independen",
          geographicArea: { "@type": "Country", name: "Indonesia" },
        },
        featureList: [
          "Manajemen polis dan nasabah (perorangan dan badan usaha)",
          "Polis asuransi umum: kebakaran, kendaraan, cargo, perjalanan, kecelakaan",
          "Koasuransi dengan porsi tiap penanggung",
          "Pengingat renewal dan jatuh tempo polis",
          "Pesan WhatsApp untuk renewal dan ringkasan harian dan bulanan",
          "Pelacakan komisi",
          "Manajemen sub-agen dengan pembagian komisi",
          "Calon nasabah dan penawaran dari beberapa penanggung",
        ],
        ...(offers.length > 0 ? { offers } : {}),
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        url: `${SITE_URL}/#faq`,
        inLanguage: "id-ID",
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  }

  // Escape "<" so plan text from the API can never close the script tag early.
  const json = JSON.stringify(data).replace(/</g, "\\u003c")

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
