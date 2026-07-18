import type { PluginDefinition } from "@arche-cms/types";

const commentsPlugin: PluginDefinition = {
  adminPanels: [
    { component: "CommentsManager", icon: "MessageSquare", label: "Comments", slug: "comments" },
  ],
  description: "Adds threaded comments to any collection entry with moderation support",
  fields: {
    "*": [{ defaultValue: true, label: "Allow Comments", name: "allowComments", type: "boolean" }],
  },
  name: "Comments",
  slug: "comments",
  version: "0.1.0",
};

export default commentsPlugin;
