import { useState, type FormEvent } from "react";
import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { Route as settingsRoute } from "@/routes/settings/index";
import { useToast } from "@/components/toast-provider";
import { useCreateWebhook } from "@/lib/hooks";
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
  path: "webhooks/new",
  component: CreateWebhook,
});

function CreateWebhook() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createWebhook = useCreateWebhook();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["collection:created"]);
  const [collection, setCollection] = useState("*");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggleEvent = (evt: string) => {
    setEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !url || events.length === 0) return;
    try {
      await createWebhook.mutateAsync({
        name: name.trim(),
        url: url.trim(),
        events,
        collection: collection.trim() || "*",
        secret: secret.trim() || undefined,
      });
      toast("Webhook created", "success");
      navigate({ to: "/settings/webhooks" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create webhook";
      setError(msg);
      toast(msg, "error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/settings/webhooks" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Webhook</h1>
          <p className="text-muted-foreground">Send HTTP requests on content events</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
        {error && <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>}

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Deploy Site"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">Payload URL</Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://example.com/webhook"
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
          <Label htmlFor="collection">Collection (optional)</Label>
          <Input
            id="collection"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            placeholder="* (all collections)"
          />
          <p className="text-xs text-muted-foreground">
            Leave as * to trigger on all collections, or enter a specific collection slug
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secret">Secret (optional)</Label>
          <Input
            id="secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="HMAC signing secret"
          />
          <p className="text-xs text-muted-foreground">
            If set, each webhook request will include an X-Webhook-Signature header
          </p>
        </div>

        <div className="flex items-center gap-2 pt-4">
          <Button type="submit" disabled={createWebhook.isPending || events.length === 0}>
            {createWebhook.isPending ? "Creating..." : "Create Webhook"}
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
