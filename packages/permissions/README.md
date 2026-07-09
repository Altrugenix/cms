# @altrugenix/permissions

Role-based access control (RBAC) engine for Altrugenix CMS. Supports role management and field-level permissions.

## Installation

```bash
yarn add @altrugenix/permissions
```

## Usage

### Access Control

```ts
import { AccessControl } from "@altrugenix/permissions";

const ac = new AccessControl(adapter);
await ac.init();

// Check if user can perform an action
const allowed = await ac.can(userId, "update", "posts");
```

### Role Management

```ts
// Create a role
await ac.createRole({
  name: "editor",
  description: "Can edit content",
  permissions: [
    { action: "create", resource: "posts" },
    { action: "update", resource: "posts" },
    { action: "read", resource: "posts" },
  ],
});

// Assign role to user
await ac.assignRole(userId, roleId);
```

### Field-Level Permissions

```ts
import { filterFields, resolveFieldPermissions } from "@altrugenix/permissions";

// Filter sensitive fields based on user permissions
const allowedFields = filterFields(fields, userPermissions, "read");

// Resolve which fields a user can read/write
const fieldPermissions = resolveFieldFields(userPermissions, "posts");
```
