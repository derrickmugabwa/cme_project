import { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPageView } from "@/components/legal/legal-page-view";
import { fetchPublishedLegalPage } from "@/lib/legal-pages-service";

interface LegalSlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: LegalSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPublishedLegalPage(slug);

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: page.title,
  };
}

export default async function LegalSlugPage({ params }: LegalSlugPageProps) {
  const { slug } = await params;
  const page = await fetchPublishedLegalPage(slug);

  if (!page) {
    notFound();
  }

  return <LegalPageView page={page} />;
}
