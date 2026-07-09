import type { PluginDefinition } from "@altrugenix/types";

const analyticsPlugin: PluginDefinition = {
  slug: "analytics",
  name: "Analytics",
  description:
    "Basic page view tracking with dashboard charts for traffic, popular content, and referrers",
  version: "0.1.0",
  adminPanels: [
    { slug: "analytics", label: "Analytics", icon: "BarChart", component: "AnalyticsDashboard" },
  ],
};

export default analyticsPlugin;
