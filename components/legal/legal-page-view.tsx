import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalPage } from "@/lib/legal-pages-service";

interface LegalPageViewProps {
  page: LegalPage;
}

function formatUpdatedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function LegalPageView({ page }: LegalPageViewProps) {
  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto max-w-4xl px-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-2xl md:text-3xl">{page.title}</CardTitle>
            <CardDescription>
              Last updated: {formatUpdatedDate(page.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="whitespace-pre-line text-sm leading-7 text-muted-foreground md:text-base">
              {page.content}
            </div>

            <div className="pt-4">
              <Button asChild className="bg-[#008C45] text-white hover:bg-[#006633]">
                <Link href="/auth/sign-up">Back to Sign Up</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
