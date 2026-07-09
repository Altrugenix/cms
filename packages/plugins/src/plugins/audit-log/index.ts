import type { PluginDefinition } from "@altrugenix/types";

const auditLogPlugin: PluginDefinition = {
  slug: "audit-log",
  name: "Audit Log",
  description:
    "Tracks all mutations (create, update, delete) on collections with before/after snapshots",
  version: "0.1.0",
  adminPanels: [
    { slug: "audit-log", label: "Audit Log", icon: "History", component: "AuditLogView" },
  ],
};

export default auditLogPlugin;
