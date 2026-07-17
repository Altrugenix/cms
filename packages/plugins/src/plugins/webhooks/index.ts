import type { PluginDefinition } from "@arche-cms/types";

const webhooksPlugin: PluginDefinition = {
  adminPanels: [
    { component: "WebhooksManager", icon: "Webhook", label: "Webhooks", slug: "webhooks" },
  ],
  description:
    "Triggers HTTP calls on collection events (create, update, delete) with configurable endpoints",
  name: "Webhooks",
  slug: "webhooks",
  version: "0.1.0",
};

export default webhooksPlugin;
