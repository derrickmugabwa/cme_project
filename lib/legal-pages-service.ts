import { createClient } from "@/lib/server";

export interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchPublishedLegalPage(slug: string): Promise<LegalPage | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("legal_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching legal page:", error);
    }
    return null;
  }

  return data;
}
