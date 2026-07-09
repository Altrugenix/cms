import type { PluginDefinition } from "@altrugenix/types";

const webhooksPlugin: PluginDefinition = {
  slug: "webhooks",
  name: "Webhooks",
  description:
    "Triggers HTTP calls on collection events (create, update, delete) with configurable endpoints",
  version: "0.1.0",
  adminPanels: [
    { slug: "webhooks", label: "Webhooks", icon: "Webhook", component: "WebhooksManager" },
  ],
};

export default webhooksPlugin;
