import type { PluginDefinition } from "@arche-cms/types";

const searchPlugin: PluginDefinition = {
  adminPanels: [
    {
      component: "SearchSettings",
      icon: "Search",
      label: "Search Settings",
      slug: "search-settings",
    },
  ],
  description: "Full-text search integration across collections with indexed fields and ranking",
  name: "Search",
  slug: "search",
  version: "0.1.0",
};

export default searchPlugin;
