# @arche-cms/cms-firebase

Firebase-backed CMS provider for Arche CMS. This package implements the `AdminProvider` interface from `@arche-cms/admin-ui`, allowing the admin panel to work with Firebase (Auth + Firestore + Storage) as the backend.

## Status

**Experimental / MVP** — This package provides basic Firebase integration for the Arche CMS admin panel. Not all features are supported in Firebase mode.

### Supported Features

- Authentication (login, register, logout, password reset)
- Collection CRUD (create, read, update, delete entries)
- Global settings (get, upsert)
- Media upload and listing
- Basic role gating via Firebase Auth custom claims
- Dashboard and read pages

### Unsupported Features (Firebase Mode)

- API tokens (no server to verify)
- Runtime schema write/edit in browser
- Server-side webhook dispatch
- Scheduled publishing workers
- GraphQL endpoint
- Full revision history

## Installation

```bash
pnpm add @arche-cms/cms-firebase firebase
```

## Setup

### 1. Environment Variables

Create a `.env` file in your project root:

```env
VITE_BACKEND_MODE=firebase

VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 2. Initialize Firebase

```typescript
import { initializeFirebase } from "@arche-cms/cms-firebase";

const app = initializeFirebase({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});
```

### 3. Use Firebase Provider

```typescript
import { FirebaseProvider } from "@arche-cms/cms-firebase";

// The provider implements the AdminProvider interface
// and can be used with the admin UI's ProviderContext
```

## Firebase Data Model

### Firestore Collections

| Collection            | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `{collection-slug}`   | One document per entry (matches schema fields + metadata) |
| `__cms_globals`       | One document per global slug                              |
| `__cms_users`         | One document per user (email, role, createdAt)            |
| `__cms_roles`         | One document per role (name, permissions JSON)            |
| `__cms_activity`      | One document per activity event                           |
| `__cms_media`         | One document per media file (metadata)                    |
| `__cms_media_folders` | One document per folder                                   |
| `__cms_api_tokens`    | One document per API token (hash, lastFour)               |

### Firebase Auth

Custom claims: `{ role: "admin" | "editor" | "viewer" }`

### Firebase Storage

Path structure: `media/{collection}/{entryId}/{filename}`

## Security Rules

This package includes security rule templates:

- `firestore.rules` — Firestore access rules
- `storage.rules` — Storage access rules
- `firestore.indexes.json` — Composite index definitions

Deploy rules with:

```bash
firebase deploy --only firestore:rules,storage
```

## Development

### Testing with Emulator

1. Start Firebase Emulator:

```bash
firebase emulators:start
```

2. Set environment variables for emulator:

```env
VITE_FIREBASE_USE_EMULATOR=true
VITE_FIREBASE_EMULATOR_HOST=localhost:8080
```

### Running Tests

```bash
pnpm test
```

## License

MIT
