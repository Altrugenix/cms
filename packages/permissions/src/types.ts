export type PermissionAction = "create" | "read" | "update" | "delete" | "*";

export interface Permission {
  action: PermissionAction;
  resource: string;
  fields?: string[] | undefined;
}

export interface RoleDefinition {
  name: string;
  description?: string | undefined;
  permissions: Permission[];
}

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = "collection" | "global" | "admin" | "system";
