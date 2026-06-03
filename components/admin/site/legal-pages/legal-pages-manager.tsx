"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Edit3, FileText, Loader2, Plus, Save } from "lucide-react";

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  updated_at: string;
}

interface LegalPageForm {
  id?: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
}

const emptyForm: LegalPageForm = {
  slug: "",
  title: "",
  content: "",
  is_published: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function LegalPagesManager() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [form, setForm] = useState<LegalPageForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const selectedPreviewUrl = useMemo(() => {
    if (!form.slug) return "";
    return `/legal/${form.slug}`;
  }, [form.slug]);

  function selectPage(page: LegalPage) {
    setForm({
      id: page.id,
      slug: page.slug,
      title: page.title,
      content: page.content,
      is_published: page.is_published,
    });
  }

  useEffect(() => {
    async function loadPages() {
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from("legal_pages")
          .select("id, slug, title, content, is_published, updated_at")
          .order("title");

        if (error) throw error;

        const legalPages = data || [];
        setPages(legalPages);

        if (legalPages.length > 0) {
          selectPage(legalPages[0]);
        }
      } catch (error) {
        console.error("Error loading legal pages:", error);
        toast({
          title: "Error",
          description: "Failed to load legal pages.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadPages();
  }, [supabase, toast]);

  function startNewPage() {
    setForm(emptyForm);
  }

  function updateTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: current.id ? current.slug : slugify(value),
    }));
  }

  async function savePage() {
    const slug = slugify(form.slug);

    if (!form.title.trim() || !slug || !form.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title, slug, and content are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        slug,
        title: form.title.trim(),
        content: form.content.trim(),
        is_published: form.is_published,
      };

      const query = form.id
        ? supabase.from("legal_pages").update(payload).eq("id", form.id).select("*").single()
        : supabase.from("legal_pages").insert(payload).select("*").single();

      const { data, error } = await query;

      if (error) throw error;

      const savedPage = data as LegalPage;
      setPages((current) => {
        const exists = current.some((page) => page.id === savedPage.id);
        const nextPages = exists
          ? current.map((page) => (page.id === savedPage.id ? savedPage : page))
          : [...current, savedPage];

        return nextPages.sort((a, b) => a.title.localeCompare(b.title));
      });
      selectPage(savedPage);

      toast({
        title: "Success",
        description: "Legal page saved successfully.",
      });
    } catch (error) {
      console.error("Error saving legal page:", error);
      toast({
        title: "Error",
        description: "Failed to save legal page. The slug may already be in use.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading legal pages...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Legal Pages
          </CardTitle>
          <CardDescription>
            Create internal pages for footer legal links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full justify-start bg-[#008C45] text-white hover:bg-[#006633]"
            onClick={startNewPage}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Legal Page
          </Button>

          <div className="space-y-2">
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => selectPage(page)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  form.id === page.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{page.title}</span>
                  <Badge variant={page.is_published ? "default" : "secondary"}>
                    {page.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  /legal/{page.slug} · {formatUpdatedAt(page.updated_at)}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            {form.id ? "Edit Legal Page" : "New Legal Page"}
          </CardTitle>
          <CardDescription>
            Footer links can point to the internal URL shown below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="legal-title">Title</Label>
              <Input
                id="legal-title"
                value={form.title}
                onChange={(event) => updateTitle(event.target.value)}
                placeholder="Terms and Conditions"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal-slug">Slug</Label>
              <Input
                id="legal-slug"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })}
                placeholder="terms"
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Internal URL: {selectedPreviewUrl || "/legal/your-page"}
          </div>

          <div className="space-y-2">
            <Label htmlFor="legal-content">Content</Label>
            <Textarea
              id="legal-content"
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              placeholder="Enter the full policy or terms text here."
              rows={18}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="legal-published" className="cursor-pointer">
                Published
              </Label>
              <p className="text-sm text-muted-foreground">
                Draft pages are hidden from the public legal route.
              </p>
            </div>
            <Switch
              id="legal-published"
              checked={form.is_published}
              onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
            />
          </div>

          <Button
            onClick={savePage}
            disabled={isSaving}
            className="w-full bg-[#008C45] text-white hover:bg-[#006633]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Legal Page
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
