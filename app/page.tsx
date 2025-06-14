import { 
  HeroSection, 
  FeaturesSection, 
  TestimonialsSection, 
  StatsSection, 
  CtaSection, 
  FooterSection,
  Navbar
} from "@/components/landing";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CtaSection />
      <FooterSection />
    </div>
  );
}
