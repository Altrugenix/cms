export { PluginManager } from "./plugin-manager.js";
export type { PluginManagerOptions } from "./plugin-manager.js";
export { discoverPlugins } from "./discovery.js";
export type { DiscoveredPlugin } from "./discovery.js";

export { default as seoPlugin } from "./plugins/seo/index.js";
export { default as auditLogPlugin } from "./plugins/audit-log/index.js";
export { default as webhooksPlugin } from "./plugins/webhooks/index.js";
export { default as searchPlugin } from "./plugins/search/index.js";
export { default as commentsPlugin } from "./plugins/comments/index.js";
export { default as analyticsPlugin } from "./plugins/analytics/index.js";
