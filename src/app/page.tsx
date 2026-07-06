import { ContactFormSection } from "@/components/home/contact-form-section";
import { DownloadSection } from "@/components/home/download-section";
import { FaqSection } from "@/components/home/faq-section";
import { HomeHero } from "@/components/home/home-hero";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { WhoWeAreSection } from "@/components/home/who-we-are-section";
import { SectionContentWrapper } from "@/components/section-content-wrapper";

export default function IndexPage() {
  return (
    <div className="w-full">
      <div className="bg-transparent">
        <HomeHero />
      </div>

      <div className="bg-background">
        <SectionContentWrapper>
          <DownloadSection />
        </SectionContentWrapper>
      </div>

      {/* Features Section */}
      <div className="bg-background">
        <SectionContentWrapper>
          <HowItWorksSection />
        </SectionContentWrapper>
      </div>

      {/* Who We Are Section */}
      <div className="bg-background">
        <SectionContentWrapper>
          <WhoWeAreSection />
        </SectionContentWrapper>
      </div>

      {/* Testimonials Section */}
      <div className="bg-background">
        <SectionContentWrapper>
          <TestimonialsSection />
        </SectionContentWrapper>
      </div>

      {/* FAQ Section */}
      <div className="bg-muted">
        <SectionContentWrapper>
          <FaqSection />
        </SectionContentWrapper>
      </div>

      {/* Contact Section */}
      <div className="bg-background">
        <SectionContentWrapper>
          <ContactFormSection />
        </SectionContentWrapper>
      </div>
    </div>
  );
}
