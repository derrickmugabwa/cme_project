import { createClient } from '@/lib/client';

export interface FooterSection {
  id: string;
  title: string;
  order_index: number;
  is_enabled: boolean;
}

export interface FooterLink {
  id: string;
  section_id: string;
  name: string;
  href: string;
  order_index: number;
  is_enabled: boolean;
  opens_new_tab: boolean;
}

export interface FooterSettings {
  id: string;
  footer_text: string | null;
  copyright_text: string | null;
  show_social_links: boolean;
  show_legal_links: boolean;
}

export interface FooterData {
  settings: FooterSettings | null;
  sections: FooterSection[];
  links: FooterLink[];
}

// Server-side function to fetch footer data
export async function fetchFooterData(): Promise<FooterData> {
  const supabase = createClient();

  try {
    // Fetch footer settings
    const { data: settings, error: settingsError } = await supabase
      .from('footer_settings')
      .select('*')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching footer settings:', settingsError);
    }

    // Fetch enabled footer sections
    const { data: sections, error: sectionsError } = await supabase
      .from('footer_sections')
      .select('*')
      .eq('is_enabled', true)
      .order('order_index');

    if (sectionsError) {
      console.error('Error fetching footer sections:', sectionsError);
    }

    // Fetch enabled footer links
    const { data: links, error: linksError } = await supabase
      .from('footer_links')
      .select('*')
      .eq('is_enabled', true)
      .order('section_id, order_index');

    if (linksError) {
      console.error('Error fetching footer links:', linksError);
    }

    return {
      settings: settings || null,
      sections: sections || [],
      links: links || [],
    };
  } catch (error) {
    console.error('Error in fetchFooterData:', error);
    return {
      settings: null,
      sections: [],
      links: [],
    };
  }
}

// Client-side function to fetch footer data
export async function fetchFooterDataClient(): Promise<FooterData> {
  const supabase = createClient();

  try {
    // Fetch footer settings
    const { data: settings, error: settingsError } = await supabase
      .from('footer_settings')
      .select('*')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching footer settings:', settingsError);
    }

    // Fetch enabled footer sections
    const { data: sections, error: sectionsError } = await supabase
      .from('footer_sections')
      .select('*')
      .eq('is_enabled', true)
      .order('order_index');

    if (sectionsError) {
      console.error('Error fetching footer sections:', sectionsError);
    }

    // Fetch enabled footer links
    const { data: links, error: linksError } = await supabase
      .from('footer_links')
      .select('*')
      .eq('is_enabled', true)
      .order('section_id, order_index');

    if (linksError) {
      console.error('Error fetching footer links:', linksError);
    }

    return {
      settings: settings || null,
      sections: sections || [],
      links: links || [],
    };
  } catch (error) {
    console.error('Error in fetchFooterDataClient:', error);
    return {
      settings: null,
      sections: [],
      links: [],
    };
  }
}

// Helper function to group links by section
export function groupLinksBySection(sections: FooterSection[], links: FooterLink[]) {
  return sections.map(section => ({
    ...section,
    links: links.filter(link => link.section_id === section.id)
  }));
}
