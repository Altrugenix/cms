# @arche-cms/rest-api

REST API route generator. Auto-generates CRUD routes from Arche CMS schema definitions.

## Installation

```bash
yarn add @arche-cms/rest-api
```

## Usage

```ts
import { generateRoutes } from "@arche-cms/rest-api";
import type { CollectionDefinition } from "@arche-cms/types";
import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

const routes = generateRoutes(collections, adapter);

for (const route of routes) {
  fastify.route(route);
}
```

## Generated Routes

For each collection, the following routes are generated:

| Method | Path                           | Description                                        |
| ------ | ------------------------------ | -------------------------------------------------- |
| GET    | `/api/:collection`             | List entries (with filtering, sorting, pagination) |
| GET    | `/api/:collection/:id`         | Get single entry                                   |
| POST   | `/api/:collection`             | Create entry                                       |
| PATCH  | `/api/:collection/:id`         | Update entry                                       |
| DELETE | `/api/:collection/:id`         | Delete entry                                       |
| POST   | `/api/:collection/bulk-delete` | Bulk delete entries                                |

## OpenAPI

Auto-generates OpenAPI 3.1.0 spec:

```ts
import { generateOpenApiSpec } from "@arche-cms/rest-api";

const spec = generateOpenApiSpec(collections, { title: "CMS API", version: "1.0.0" });
```
