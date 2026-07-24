# @arche-cms/cms-firebase

Firebase backend for Arche CMS. Provides Firestore-backed content, auth, media, globals, activity, users, and roles via the `AdminProvider` interface.

## Installation

```bash
pnpm add @arche-cms/cms-firebase firebase
```

## Quick Start

```bash
# 1. Run the setup wizard
cms firebase setup

# 2. Fill in your Firebase project values in .env.local

# 3. Start the Firebase emulator
firebase emulators:start

# 4. Start the CMS dev server
pnpm dev
```

## Environment Variables

```env
VITE_BACKEND_MODE=firebase
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Capability Matrix

### Supported in Firebase Mode

| Feature                        | Status | Notes                              |
| ------------------------------ | ------ | ---------------------------------- |
| Auth (email/password)          | Done   | Firebase Auth with custom claims   |
| Collections (CRUD)             | Done   | One Firestore collection per slug  |
| Bulk operations                | Done   | writeBatch for atomic bulk ops     |
| Globals (read/write)           | Done   | Single doc per global slug         |
| Media (upload/list/delete)     | Done   | Firebase Storage + Firestore meta  |
| Media folders                  | Done   | Folder management in Firestore     |
| Draft / publish workflow       | Done   | `_status` field on documents       |
| Soft delete                    | Done   | `_deletedAt` field, auto-filtered  |
| Activity log                   | Done   | Audit events on content mutations  |
| Users CRUD                     | Done   | Firestore `__cms_users` collection |
| Roles CRUD                     | Done   | Firestore `__cms_roles` collection |
| RBAC (admin/editor/viewer)     | Done   | Custom claims + security rules     |
| Query filters (eq/ne/gt/lt/in) | Done   | Firestore where clauses            |
| Pagination                     | Done   | Cursor-based via startAfter        |
| Offline persistence            | Done   | Firebase offline enabled           |

### Not Supported in Firebase Mode (MVP)

| Feature                | Status | Reason                            |
| ---------------------- | ------ | --------------------------------- |
| API Tokens             | N/A    | No server to verify tokens        |
| Webhooks               | N/A    | No server-side dispatch           |
| Schema Builder (write) | N/A    | Read-only in Firebase mode        |
| Plugins                | N/A    | Server-side only                  |
| GraphQL endpoint       | N/A    | REST only in Firebase mode        |
| Scheduled publishing   | N/A    | No background workers             |
| Full-text search       | Todo   | Firestore limitations             |
| Content relations      | Todo   | Requires cross-collection queries |
| Deep population        | Todo   | Deferred to parity phase          |
| Component schemas      | Todo   | Deferred to parity phase          |
| Dynamic zones          | Todo   | Deferred to parity phase          |
| Version history (full) | Todo   | Minimal version only in MVP       |

## CLI Commands

```bash
# Interactive Firebase setup wizard
cms firebase setup

# Deploy Firestore and Storage security rules
cms firebase deploy-rules

# Deploy Firestore composite indexes
cms firebase deploy-indexes
```

## Architecture

```
src/
├── config.ts         # Firebase config (import.meta.env)
├── auth.ts           # Auth provider (login, register, claims)
├── content.ts        # Collections CRUD provider
├── globals.ts        # Globals read/write provider
├── media.ts          # Media + folders provider
├── users.ts          # Users provider
├── roles.ts          # Roles provider
├── activity.ts       # Activity log provider
├── provider.ts       # AdminProvider composition + activity hooks
├── query-builder.ts  # Firestore query filters
└── index.ts          # Barrel exports
```

## Security Rules

RBAC security rules are in `firestore.rules` and `storage.rules`. Role claims are set on Firebase Auth users:

| Role   | Permissions                                   |
| ------ | --------------------------------------------- |
| admin  | Full access (`*:*`)                           |
| editor | Create, read, update (`create/read/update:*`) |
| viewer | Read only (`read:*`)                          |

### Deploying Rules

```bash
cms firebase deploy-rules
# or
firebase deploy --only firestore:rules,storage
```

### Deploying Indexes

```bash
cms firebase deploy-indexes
# or
firebase deploy --only firestore:indexes
```

## Testing

Tests require the Firebase emulator suite.

```bash
# Run all tests (integration tests skip without emulator)
pnpm test

# Run with emulator for integration tests
FIREBASE_EMULATOR=true pnpm test
```

## Data Model

```
Firestore Collections:
  {collection-slug}         One doc per entry (fields + metadata)
  __cms_globals             One doc per global slug
  __cms_users               One doc per user (email, role, timestamps)
  __cms_roles               One doc per role (name, permissions JSON)
  __cms_activity            One doc per activity event
  __cms_media               One doc per media file (metadata)
  __cms_media_folders       One doc per folder

Firebase Storage:
  media/{collection}/{entryId}/{filename}

Firebase Auth:
  Custom Claims: { role: "admin" | "editor" | "viewer" }
```

## Security

- All writes require authenticated Firebase Auth
- Role checks enforced via custom claims in Firestore Security Rules
- Storage uploads gated by auth (10MB limit)
- Admin-only for deletes and user/role management
- Soft-delete pattern prevents data loss
