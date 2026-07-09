import type { PluginDefinition } from "@altrugenix/types";

const commentsPlugin: PluginDefinition = {
  slug: "comments",
  name: "Comments",
  description: "Adds threaded comments to any collection entry with moderation support",
  version: "0.1.0",
  fields: {
    "*": [{ name: "allowComments", type: "boolean", label: "Allow Comments", defaultValue: true }],
  },
  adminPanels: [
    { slug: "comments", label: "Comments", icon: "MessageSquare", component: "CommentsManager" },
  ],
};

export default commentsPlugin;
