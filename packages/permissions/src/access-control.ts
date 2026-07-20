import type { DatabaseAdapter } from "@arche-cms/database";

import type { Permission, RoleRecord } from "./types.js";

const ROLES_TABLE = "__cms_roles";

const DEFAULT_ROLES: RoleRecord[] = [
  {
    createdAt: new Date().toISOString(),
    description: "Full access to all resources",
    id: "1",
    name: "admin",
    permissions: [{ action: "*", resource: "*" }],
    updatedAt: new Date().toISOString(),
  },
  {
    createdAt: new Date().toISOString(),
    description: "Can create, read, update content",
    id: "2",
    name: "editor",
    permissions: [
      { action: "create", resource: "*" },
      { action: "read", resource: "*" },
      { action: "update", resource: "*" },
    ],
    updatedAt: new Date().toISOString(),
  },
  {
    createdAt: new Date().toISOString(),
    description: "Read-only access",
    id: "3",
    name: "viewer",
    permissions: [{ action: "read", resource: "*" }],
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
      createdAt: "TEXT NOT NULL",
      description: "TEXT",
      name: "TEXT NOT NULL UNIQUE",
      permissions: "TEXT",
      updatedAt: "TEXT NOT NULL",
    });
    this.initialized = true;
  }

  async seedDefaultRoles(): Promise<void> {
    const existing = await this.db.findMany(ROLES_TABLE, { limit: 10 });
    if (existing.total > 0) {
      const corrupted = existing.data.some((row) => {
        const perms = (row as unknown as RoleRecord).permissions;
        return !Array.isArray(perms);
      });
      if (!corrupted) return;
      for (const row of existing.data) {
        await this.db.delete(ROLES_TABLE, String((row as Record<string, unknown>).id));
      }
    }

    for (const role of DEFAULT_ROLES) {
      await this.db.create(ROLES_TABLE, role as unknown as Record<string, unknown>);
    }
  }

  async getRole(name: string): Promise<RoleRecord | null> {
    const result = await this.db.findMany(ROLES_TABLE, { limit: 1, where: { name } });
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
      createdAt: now,
      description,
      name,
      permissions,
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
