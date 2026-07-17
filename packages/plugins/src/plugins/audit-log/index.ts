import type { PluginDefinition } from "@arche-cms/types";

const auditLogPlugin: PluginDefinition = {
  adminPanels: [
    { component: "AuditLogView", icon: "History", label: "Audit Log", slug: "audit-log" },
  ],
  description:
    "Tracks all mutations (create, update, delete) on collections with before/after snapshots",
  name: "Audit Log",
  slug: "audit-log",
  version: "0.1.0",
};

export default auditLogPlugin;
