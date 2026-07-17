import type { PluginDefinition } from "@arche-cms/types";

const analyticsPlugin: PluginDefinition = {
  adminPanels: [
    { component: "AnalyticsDashboard", icon: "BarChart", label: "Analytics", slug: "analytics" },
  ],
  description:
    "Basic page view tracking with dashboard charts for traffic, popular content, and referrers",
  name: "Analytics",
  slug: "analytics",
  version: "0.1.0",
};

export default analyticsPlugin;
