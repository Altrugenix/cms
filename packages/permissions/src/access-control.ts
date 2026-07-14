import type { DatabaseAdapter } from "@arche-cms/database";
import type { Permission, RoleRecord } from "./types.js";

const ROLES_TABLE = "__cms_roles";

const DEFAULT_ROLES: RoleRecord[] = [
  {
    id: "1",
    name: "admin",
    description: "Full access to all resources",
    permissions: [{ action: "*", resource: "*" }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "editor",
    description: "Can create, read, update content",
    permissions: [
      { action: "create", resource: "*" },
      { action: "read", resource: "*" },
      { action: "update", resource: "*" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "viewer",
    description: "Read-only access",
    permissions: [{ action: "read", resource: "*" }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function actionMatches(required: string, granted: string): boolean {
  return granted === "*" || granted === required;
}

function resourceMatches(required: string, granted: string): boolean {
  return granted === "*" || granted === required;
}

export class AccessControl {
  private readonly db: DatabaseAdapter;
  private initialized = false;

  constructor(db: DatabaseAdapter) {
    this.db = db;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.db.createTable(ROLES_TABLE, {
      name: "TEXT NOT NULL UNIQUE",
      description: "TEXT",
      permissions: "TEXT",
      createdAt: "TEXT NOT NULL",
      updatedAt: "TEXT NOT NULL",
    });
    this.initialized = true;
  }

  async seedDefaultRoles(): Promise<void> {
    const existing = await this.db.findMany(ROLES_TABLE, { limit: 1 });
    if (existing.total > 0) return;

    for (const role of DEFAULT_ROLES) {
      await this.db.create(ROLES_TABLE, role as unknown as Record<string, unknown>);
    }
  }

  async getRole(name: string): Promise<RoleRecord | null> {
    const result = await this.db.findMany(ROLES_TABLE, { where: { name }, limit: 1 });
    const row = result.data[0];
    if (!row) return null;
    return row as unknown as RoleRecord;
  }

  async getRoleById(id: string): Promise<RoleRecord | null> {
    const row = await this.db.findOne(ROLES_TABLE, id);
    if (!row) return null;
    return row as unknown as RoleRecord;
  }

  async getAllRoles(): Promise<RoleRecord[]> {
    const result = await this.db.findMany(ROLES_TABLE);
    return result.data as unknown as RoleRecord[];
  }

  async createRole(
    name: string,
    description: string,
    permissions: Permission[],
  ): Promise<RoleRecord> {
    const existing = await this.getRole(name);
    if (existing) {
      throw new Error(`Role "${name}" already exists`);
    }

    const now = new Date().toISOString();
    const created = await this.db.create(ROLES_TABLE, {
      name,
      description,
      permissions,
      createdAt: now,
      updatedAt: now,
    });
    return created as unknown as RoleRecord;
  }

  async updateRole(
    id: string,
    data: Partial<Omit<RoleRecord, "id" | "createdAt">>,
  ): Promise<RoleRecord | null> {
    const updated = await this.db.update(ROLES_TABLE, id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) return null;
    return updated as unknown as RoleRecord;
  }

  async deleteRole(id: string): Promise<boolean> {
    return this.db.delete(ROLES_TABLE, id);
  }

  async check(roleName: string, action: string, resource: string): Promise<boolean> {
    const role = await this.getRole(roleName);
    if (!role) return false;

    for (const permission of role.permissions) {
      if (
        actionMatches(action, permission.action) &&
        resourceMatches(resource, permission.resource)
      ) {
        return true;
      }
    }
    return false;
  }

  filterFields(roleName: string, resource: string, fields: string[]): Promise<string[]> {
    return this.resolveFieldPermissions(roleName, resource, fields, "read");
  }

  private async resolveFieldPermissions(
    roleName: string,
    resource: string,
    fields: string[],
    action: string,
  ): Promise<string[]> {
    const role = await this.getRole(roleName);
    if (!role) return [];

    const allowed: string[] = [];

    for (const field of fields) {
      let hasAccess = false;

      for (const permission of role.permissions) {
        if (!actionMatches(action, permission.action)) continue;
        if (!resourceMatches(resource, permission.resource)) continue;

        if (!permission.fields || permission.fields.length === 0) {
          hasAccess = true;
          break;
        }

        if (permission.fields.includes(field)) {
          hasAccess = true;
          break;
        }
      }

      if (hasAccess) {
        allowed.push(field);
      }
    }

    return allowed;
  }
}
