import { notFound } from "next/navigation";
import { LegalPageView } from "@/components/legal/legal-page-view";
import { fetchPublishedLegalPage } from "@/lib/legal-pages-service";

export default async function PrivacyPage() {
  const page = await fetchPublishedLegalPage("privacy");

  if (!page) {
    notFound();
  }

  return <LegalPageView page={page} />;
}
