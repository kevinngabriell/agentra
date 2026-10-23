import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AgentModeProvider } from "@/components/layout/AgentMode";
import { PlanGate } from "@/components/layout/PlanGate";
import { HelpButton } from "@/components/layout/HelpButton";
import { WelcomeGuide } from "@/components/layout/WelcomeGuide";

// The authenticated app must never be indexed (robots.ts also disallows /agentra/).
export const metadata: Metadata = {
  // Plain "Agentra" tab title instead of the marketing title; ignores the root "%s | Agentra" template.
  title: {
    absolute: "Agentra",
  },
  // Drop the root canonical ("/") so private pages don't point at the landing page.
  alternates: {
    canonical: null,
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AgentraLayout({ children }: { children: ReactNode }) {
  return (
    <AgentModeProvider>
      {children}
      <PlanGate />
      <HelpButton />
      <WelcomeGuide />
    </AgentModeProvider>
  );
}
