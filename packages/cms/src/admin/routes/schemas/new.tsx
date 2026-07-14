import { useState } from "react";
import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { useToast } from "@/components/toast-provider";
import { createSchema } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/schemas/new",
  component: NewSchema,
});

const SCHEMA_TYPES = [
  {
    value: "collection",
    label: "Collection",
    desc: "A content type with multiple entries (e.g. Posts, Users)",
  },
  {
    value: "global",
    label: "Global",
    desc: "A singleton with single-entry data (e.g. Site Settings)",
  },
  {
    value: "component",
    label: "Component",
    desc: "A reusable field group (e.g. Address Block, SEO)",
  },
] as const;

function NewSchema() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [type, setType] = useState<string>("collection");
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSlug = slug.trim();
    const trimmedLabel = label.trim() || trimmedSlug;
    if (!trimmedSlug) {
      toast("Slug is required", "error");
      return;
    }
    if (!/^[a-z][a-z0-9-]*$/.test(trimmedSlug)) {
      toast(
        "Slug must start with a letter and contain only lowercase letters, numbers, and hyphens",
        "error",
      );
      return;
    }
    setCreating(true);
    try {
      await createSchema(type, { slug: trimmedSlug, label: trimmedLabel });
      toast("Schema created", "success");
      navigate({ to: "/schemas/$type/$slug", params: { type, slug: trimmedSlug } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create schema";
      toast(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/schemas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Schema</h1>
          <p className="text-muted-foreground">Create a new collection, global, or component</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6">
        <div className="space-y-3">
          <Label>Schema Type</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {SCHEMA_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  type === t.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted"
                }`}
              >
                <p className="text-sm font-medium capitalize">{t.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
              setSlug(v);
              if (!label) setLabel(v.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
            }}
            placeholder="e.g. blog-posts"
          />
          <p className="text-xs text-muted-foreground">
            Used as the identifier and file name. Lowercase with hyphens.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Blog Posts"
          />
          <p className="text-xs text-muted-foreground">
            Human-readable name shown in the admin UI.
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={creating}>
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Creating..." : "Create Schema"}
        </Button>
      </form>
    </div>
  );
}
