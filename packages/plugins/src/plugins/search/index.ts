import type { PluginDefinition } from "@altrugenix/types";

const searchPlugin: PluginDefinition = {
  slug: "search",
  name: "Search",
  description: "Full-text search integration across collections with indexed fields and ranking",
  version: "0.1.0",
  adminPanels: [
    {
      slug: "search-settings",
      label: "Search Settings",
      icon: "Search",
      component: "SearchSettings",
    },
  ],
};

export default searchPlugin;
