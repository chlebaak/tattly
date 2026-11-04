import { SiteHeader } from "@/components/marketing/site-header";
import { Hero } from "@/components/marketing/hero";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { Steps } from "@/components/marketing/steps";
import { Features } from "@/components/marketing/features";
import { Pricing } from "@/components/marketing/pricing";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/cta";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function HomePage() {
  return (
    <main id="main" className="relative min-h-svh">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-[10px] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Přeskočit na obsah
      </a>
      <SiteHeader />
      <Hero />
      <TrustStrip />
      <Steps />
      <Features />
      <Pricing />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}
