import { notFound } from "next/navigation";
import { LegalPageView } from "@/components/legal/legal-page-view";
import { fetchPublishedLegalPage } from "@/lib/legal-pages-service";

export default async function TermsPage() {
  const page = await fetchPublishedLegalPage("terms");

  if (!page) {
    notFound();
  }

  return <LegalPageView page={page} />;
}
