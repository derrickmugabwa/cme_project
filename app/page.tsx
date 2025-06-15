import { createClient } from "@/lib/server";
import { Metadata } from "next";
import { 
  HeroSection, 
  FeaturesSection, 
  TestimonialsSection, 
  StatsSection, 
  CtaSection, 
  FooterSection,
  Navbar
} from "@/components/landing";
import { SupabaseClient } from "@supabase/supabase-js";

// Define component prop interfaces for landing page sections
interface HeroSectionProps {
  id: string;
  title: string;
  subtitle: string;
  primary_button_text: string;
  primary_button_url: string;
  secondary_button_text: string | null;
  secondary_button_url: string | null;
  image_url: string | null;
}

interface FeatureSectionProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  order_index: number;
}

interface TestimonialSectionProps {
  id: string;
  name: string;
  title: string;
  quote: string;
  avatar_url: string;
  rating: number;
  order_index: number;
}

interface StatSectionProps {
  id: string;
  title: string;
  value: number;
  suffix: string;
  icon: string;
  order_index: number;
}

interface CtaSectionProps {
  id: string;
  title: string;
  subtitle: string;
  primary_button_text: string;
  primary_button_url: string;
  secondary_button_text: string | null;
  secondary_button_url: string | null;
  background_image_url: string | null;
  additional_notes: string | null;
}

interface FooterSectionProps {
  id: string;
  site_name: string;
  site_description: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  social_links: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
  };
  show_hero: boolean;
  show_features: boolean;
  show_testimonials: boolean;
  show_stats: boolean;
  show_cta: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
}

// Database schema types
interface DbHeroContent {
  id: string;
  title: string;
  subtitle: string;
  cta_primary_text: string;
  cta_primary_url?: string;
  cta_secondary_text: string;
  cta_secondary_url?: string;
  image_url?: string;
}

interface DbFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  order_index: number;
}

interface DbTestimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar_url: string | null;
  rating: number;
  order_index: number;
}

interface DbStat {
  id: string;
  title: string;
  value: string;
  icon: string;
  order_index: number;
}

interface DbCtaContent {
  id: string;
  title: string;
  description: string;
  button_primary_text: string;
  button_primary_url?: string;
  button_secondary_text: string;
  button_secondary_url?: string;
  background_image_url?: string;
}

interface DbLandingSettings {
  id: string;
  site_title: string;
  meta_description: string;
  site_description?: string;
  contact_email?: string;
  contact_phone?: string;
  social_links?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  show_hero?: boolean;
  show_features?: boolean;
  show_testimonials?: boolean;
  show_stats?: boolean;
  show_cta?: boolean;
  footer_text?: string;
}

// Generate metadata for the page
export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  
  // Fetch settings
  const { data: settings } = await supabase
    .from('landing_settings')
    .select('*')
    .single();
  
  if (!settings) {
    return {
      title: 'CME Platform',
      description: 'Continuing Medical Education Platform',
    };
  }
  
  return {
    title: settings.site_title,
    description: settings.meta_description,
  };
}

async function fetchLandingData() {
  const supabase = await createClient();
  
  // Fetch all data in parallel
  const [heroResult, featuresResult, testimonialsResult, statsResult, ctaResult, settingsResult] = await Promise.all([
    supabase.from('landing_hero').select('*').single(),
    supabase.from('landing_features').select('*').order('order_index', { ascending: true }),
    supabase.from('landing_testimonials').select('*').order('order_index', { ascending: true }),
    supabase.from('landing_stats').select('*').order('order_index', { ascending: true }),
    supabase.from('landing_cta').select('*').single(),
    supabase.from('landing_settings').select('*').single()
  ]);
  
  // Transform the data to match our component props
  const hero = heroResult.data ? {
    ...heroResult.data,
    primary_button_text: heroResult.data.cta_primary_text,
    primary_button_url: heroResult.data.cta_primary_url || '/auth/sign-up',
    secondary_button_text: heroResult.data.cta_secondary_text,
    secondary_button_url: heroResult.data.cta_secondary_url || '#features'
  } : null;
  
  const cta = ctaResult.data ? {
    ...ctaResult.data,
    subtitle: ctaResult.data.description,
    primary_button_text: ctaResult.data.button_primary_text,
    primary_button_url: ctaResult.data.button_primary_url || '/auth/sign-up',
    secondary_button_text: ctaResult.data.button_secondary_text,
    secondary_button_url: ctaResult.data.button_secondary_url || '/contact',
    additional_notes: 'No credit card required • Free trial available • Cancel anytime'
  } : null;
  
  // Transform testimonials data
  const testimonials = testimonialsResult.data ? testimonialsResult.data.map((item: DbTestimonial) => ({
    id: item.id,
    name: item.name,
    title: `${item.role} at ${item.company}`,
    quote: item.content,
    avatar_url: item.avatar_url || '/images/placeholder-avatar.png',
    rating: item.rating,
    order_index: item.order_index
  })) : [];
  
  // Transform stats data
  const stats = statsResult.data ? statsResult.data.map((item: DbStat) => {
    const valueMatch = item.value.match(/([\d,.]+)([^\d]*)/);    
    return {
      id: item.id,
      title: item.title,
      value: valueMatch ? parseInt(valueMatch[1].replace(/,/g, '')) : 0,
      suffix: valueMatch ? valueMatch[2] : '',
      icon: item.icon,
      order_index: item.order_index
    };
  }) : [];
  
  const settings = settingsResult.data ? {
    ...settingsResult.data,
    site_name: settingsResult.data.site_title,
    site_description: settingsResult.data.site_description || settingsResult.data.meta_description,
    social_links: settingsResult.data.social_links || {},
    show_hero: settingsResult.data.show_hero !== false,
    show_features: settingsResult.data.show_features !== false,
    show_testimonials: settingsResult.data.show_testimonials !== false,
    show_stats: settingsResult.data.show_stats !== false,
    show_cta: settingsResult.data.show_cta !== false,
    seo_title: settingsResult.data.site_title,
    seo_description: settingsResult.data.meta_description,
    seo_keywords: null,
    contact_phone: null,
    address: null
  } : null;
  
  return {
    hero: hero as HeroSectionProps,
    features: featuresResult.data as FeatureSectionProps[],
    testimonials: testimonials as TestimonialSectionProps[],
    stats: stats as StatSectionProps[],
    cta: cta as CtaSectionProps,
    settings: settings as FooterSectionProps
  };
}

export default async function Home() {
  const data = await fetchLandingData();
  const { hero, features, testimonials, stats, cta, settings } = data;
  
  return (
    <div className="min-h-screen">
      <Navbar />
      {settings?.show_hero !== false && hero && <HeroSection data={hero} />}
      {settings?.show_stats !== false && stats && <StatsSection data={stats} />}
      {settings?.show_features !== false && features && <FeaturesSection data={features} />}
      {settings?.show_testimonials !== false && testimonials && <TestimonialsSection data={testimonials} />}
      {settings?.show_cta !== false && cta && <CtaSection data={cta} />}
      <FooterSection settings={settings} />
    </div>
  );
}
