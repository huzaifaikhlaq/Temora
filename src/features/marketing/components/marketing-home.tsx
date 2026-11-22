import { MarketingHeader } from "@/features/marketing/components/marketing-header";
import { HeroSection } from "@/features/marketing/components/hero-section";
import { ProductShowcase } from "@/features/marketing/components/product-showcase";
import { CapabilitySection, EnterpriseSection, MetricsSection, TestimonialSection } from "@/features/marketing/components/value-sections";
import { RoleExperienceSection } from "@/features/marketing/components/role-experience-section";
import { ConversionSection } from "@/features/marketing/components/conversion-section";
import { SiteFooter } from "@/features/marketing/components/site-footer";

export function MarketingHome() {
  return (
    <div className="marketing-shell min-h-screen bg-[#faf8ff] text-[#181b24]">
      <MarketingHeader />
      <main id="main-content" className="pt-16">
        <div className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 -z-0 h-[30rem] w-[61rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#635bff]/20 via-[#e2dfff]/35 to-transparent blur-3xl"
          />
          <HeroSection />
          <ProductShowcase />
        </div>
        <MetricsSection />
        <CapabilitySection />
        <RoleExperienceSection />
        <EnterpriseSection />
        <TestimonialSection />
        <ConversionSection />
      </main>
      <SiteFooter />
    </div>
  );
}
