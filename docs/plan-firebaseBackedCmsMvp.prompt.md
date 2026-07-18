## Plan: Firebase-Backed CMS MVP Variant

Build an MVP variant of the CMS admin that uses Firebase directly (Auth + Firestore + Storage) and does not depend on the current Fastify REST/GraphQL API. The recommended path is to introduce a provider abstraction in the admin layer, keep current REST behavior as one provider, and add a Firebase provider for MVP scope. This minimizes UI churn and preserves future extensibility.

**Steps**

1. Define MVP scope and feature flags (_blocks 2-6_):

- Include: login/logout, current-user session, collection/global CRUD, media upload + listing, basic role gating, dashboard/read pages needed by admin navigation.
- Exclude for MVP: API tokens, runtime schema write/edit in browser, server webhooks dispatch/retries, scheduled publishing workers, GraphQL endpoint.
- Add a backend mode config in admin runtime (`rest` | `firebase`) to gate behavior and route visibility.

2. Phase 1 - Extract admin backend provider boundary (_depends on 1_):

- Create an internal provider contract for all admin data/auth/media operations currently implemented in `api.ts` and partially direct-called from route files.
- Refactor React Query hooks to call provider methods instead of hardcoded `/api` endpoints.
- Remove direct `apiFetch` calls from route components and centralize access through provider interfaces.
- Keep the existing REST implementation as `RestProvider` to avoid regressions while introducing `FirebaseProvider`.

3. Phase 2 - Implement Firebase provider MVP (_depends on 2_):

- Auth: replace JWT refresh-cycle assumptions with Firebase Auth session listener + token retrieval.
- Content: map collection/global CRUD into Firestore document model (collection-scoped docs + metadata fields for status/deletedAt/version counters).
- Media: implement Firebase Storage uploads and Firestore metadata records, replacing `/api/media/*` URL assumptions.
- Queries: adapt filtering/sorting/pagination for Firestore constraints and document required index set.

4. Phase 3 - RBAC and security rules (_depends on 3_):

- Define role model using custom claims + optional role documents.
- Encode permission matrix in Firestore/Storage Security Rules equivalent to key `requirePermission` checks.
- Add audit event writes for critical mutations (create/update/delete/publish) for operational traceability.

5. Phase 4 - Mode-aware admin UX and unsupported features (_depends on 3, parallel with 4_):

- Hide or mark unsupported pages/actions in Firebase mode (API tokens, schema write operations, webhook/scheduler controls if present in UI).
- Ensure route guards and menu config reflect backend mode to prevent dead-end navigation.
- Update empty/error states to explain Firebase-mode limitations.

6. Phase 5 - Validation and test strategy (_depends on 4,5_):

- Add provider contract tests to ensure UI-facing behavior matches expectations.
- Add Firebase Emulator integration tests for auth, rules, CRUD, and media flows.
- Keep existing Fastify route tests unchanged for REST mode; add a separate Firebase test suite for MVP.

7. Phase 6 - Packaging and rollout (_depends on 6_):

- Provide startup/config docs for Firebase mode (required env vars, emulator/prod setup, index deployment).
- Ship as experimental backend mode in `packages/cms` with explicit MVP capability matrix.

**Relevant files**

- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/admin/lib/api.ts` — current API client + endpoint wrappers; primary extraction target for provider contract.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/admin/lib/auth.tsx` — JWT/refresh flow; replace with Firebase Auth session model in Firebase provider path.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/admin/lib/hooks.ts` — React Query hooks currently bound to endpoint URLs; migrate to provider method calls.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/admin/routes/collections/new.$slug.tsx` — contains direct create/publish API usage to route through provider.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/admin/routes/collections/$id_.$slug.edit.tsx` — direct update/publish path; move to provider operations.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/admin/routes/forgot-password.tsx` — switch password reset to Firebase Auth flow.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/admin/components/field-input.tsx` — media and schema-dependent interactions needing provider-aware behavior.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/admin/vite.config.ts` — remove/conditionalize API proxy assumptions for Firebase mode.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/index.ts` — add backend mode config typing and public API for selecting provider.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/server/routes/schemas.ts` — reference for explicitly unsupported runtime schema mutation in Firebase MVP.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/server/routes/api-tokens.ts` — reference for explicitly unsupported API token lifecycle in Firebase MVP.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/server/services/scheduled-publisher.ts` — reference for deferred parity feature requiring backend compute.
- `/Users/chesteralan/Projects/arche-cms/packages/cms/src/server/lib/webhooks.ts` — reference for deferred parity feature requiring trusted backend worker.

**Verification**

1. Provider wiring verification:

- Run admin in REST mode and ensure no behavior regressions on login, list/create/edit entries, media upload.
- Switch to Firebase mode and verify same core UI flows complete without `/api` network usage.

2. Security verification (Firebase Emulator):

- Validate each action (read/create/update/delete/publish/media upload) against role permutations and unauthenticated user denial.
- Confirm forbidden writes are blocked by rules, not only hidden in UI.

3. Data behavior verification:

- Validate filtering/sorting/pagination behavior in Firebase mode for representative collection sizes.
- Validate soft-delete and publish state transitions are reflected consistently in list/detail views.

4. Test execution:

- Run package tests for existing REST behavior.
- Run new Firebase emulator integration tests for auth/rules/content/media contract.

5. Documentation verification:

- Confirm README/backend mode docs accurately describe supported vs unsupported features for Firebase MVP.

**Decisions**

- Chosen scope: MVP.
- Keep “no CMS API needed” by using direct Firebase client SDK from admin.
- Use provider abstraction to preserve architecture and allow dual backend support.
- Explicitly out-of-scope for MVP: API tokens, schema runtime editing, webhook dispatcher, scheduled publisher.

**Further Considerations**

1. Firestore data shape recommendation:

- Option A: one collection per CMS collection slug (simpler queries, easier indexes).
- Option B: single `entries` collection with discriminator fields (more uniform tooling, harder indexes).
- Recommended for MVP: Option A.

2. Versioning strategy recommendation:

- Option A: minimal `updatedAt/version` only.
- Option B: full revision subcollections per entry.
- Recommended for MVP: Option A; add Option B in parity phase.

3. Schema management recommendation:

- Option A: read-only schema UI in Firebase mode with CLI-managed schema source of truth.
- Option B: add secure backend channel later for remote schema mutations.
- Recommended for MVP: Option A.
