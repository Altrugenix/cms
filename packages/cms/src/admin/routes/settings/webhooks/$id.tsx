import { useEffect, useState, type FormEvent } from "react";
import { createRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { Route as settingsRoute } from "@/routes/settings/index";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { fetchWebhook, updateWebhook, type WebhookMeta } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

const WEBHOOK_EVENTS = [
  { value: "collection:created", label: "Entry Created" },
  { value: "collection:updated", label: "Entry Updated" },
  { value: "collection:deleted", label: "Entry Deleted" },
];

export const Route = createRoute({
  getParentRoute: () => settingsRoute,
  path: "webhooks/$id",
  component: EditWebhook,
});

function EditWebhook() {
  const { id } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [webhook, setWebhook] = useState<WebhookMeta | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [collection, setCollection] = useState("*");
  const [enabled, setEnabled] = useState(true);
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchWebhook(id);
        if (cancelled) return;
        setWebhook(data);
        setName(data.name);
        setUrl(data.url);
        setEvents(data.events);
        setCollection(data.collection);
        setEnabled(data.enabled);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load webhook");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleEvent = (evt: string) => {
    setEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!webhook || !name || !url || events.length === 0) return;
    setSaving(true);
    try {
      await updateWebhook(id, {
        name: name.trim(),
        url: url.trim(),
        events,
        collection: collection.trim() || "*",
        enabled,
        secret: secret.trim() || undefined,
      });
      toast("Webhook updated", "success");
      navigate({ to: "/settings/webhooks" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update webhook";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-5" />
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-1 h-5 w-24" />
          </div>
        </div>
        <div className="space-y-6 rounded-lg border p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error)
    return <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>;
  if (!webhook) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/settings/webhooks" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Webhook</h1>
          <p className="text-muted-foreground">{webhook.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
        {error && <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>}

        <div className="flex items-center gap-3">
          <Label htmlFor="enabled" className="cursor-pointer">
            Enabled
          </Label>
          <input
            id="enabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">Payload URL</Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Events</Label>
          <p className="text-xs text-muted-foreground">
            Select which events should trigger this webhook
          </p>
          <div className="flex flex-wrap gap-3">
            {WEBHOOK_EVENTS.map((evt) => (
              <label key={evt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={events.includes(evt.value)}
                  onChange={() => toggleEvent(evt.value)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm">{evt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="collection">Collection</Label>
          <Input
            id="collection"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            placeholder="* (all collections)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secret">
            Secret {webhook.hasSecret ? "(leave blank to keep current)" : "(optional)"}
          </Label>
          <Input
            id="secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="New HMAC signing secret"
          />
        </div>

        <div className="flex items-center gap-2 pt-4">
          <Button type="submit" disabled={saving || events.length === 0}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link to="/settings/webhooks">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
