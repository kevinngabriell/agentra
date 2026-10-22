import type { Metadata } from "next"
import { Header } from "../components/Header"
import { HeroSection } from "../components/HeroSection"
import { FeaturesSection } from "../components/FeaturesSection"
import { PricingSection } from "../components/PricingSection"
import { Footer } from "../components/Footer"
import { StructuredData } from "../components/StructuredData"
import { HOME_DESCRIPTION, HOME_TITLE } from "./seo"

export const metadata: Metadata = {
  // Same segment as the root layout, so the "%s | Agentra" template doesn't apply here.
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
}

// Re-render hourly so the JSON-LD offers follow price changes in the plans API.
export const revalidate = 3600

export default function Home() {

  return (
    <>
      <StructuredData />
      {/* Server Component: no event handlers allowed, so the reveal-on-focus is pure CSS. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[1000] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-[#0D1B3E] focus:shadow"
      >
        Lewati ke konten
      </a>
      <Header />
      <main id="main">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
      </main>
      <Footer />
    </>
  )
}
