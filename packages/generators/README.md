# @altrugenix/generators

Code generation pipeline. Orchestrates all code generators (types, routes, validation, migrations, GraphQL, OpenAPI, SDK, admin forms).

## Installation

```bash
yarn add @altrugenix/generators
```

## Usage

```ts
import { GenerationPipeline } from "@altrugenix/generators";

const pipeline = new GenerationPipeline({
  collections,
  globals,
  outputDir: "./generated",
});

await pipeline.generate({
  types: true,
  apiRoutes: true,
  validation: true,
  migrations: true,
  graphql: true,
  openapi: true,
  sdk: true,
  adminForms: true,
});
```

## Individual Generators

Each generator can be used independently:

```ts
import { TypeGenerator } from "@altrugenix/generators";
import { ApiRouteGenerator } from "@altrugenix/generators";
import { ValidationGenerator } from "@altrugenix/generators";
import { MigrationGenerator } from "@altrugenix/generators";
import { GraphQLGenerator } from "@altrugenix/generators";
import { OpenApiGenerator } from "@altrugenix/generators";
import { SdkGenerator } from "@altrugenix/generators";
import { AdminFormGenerator } from "@altrugenix/generators";
```

## Generator Interface

```ts
interface Generator {
  name: string;
  generate(schemas: {
    collections: CollectionDefinition[];
    globals?: GlobalDefinition[];
  }): Promise<void>;
}
```
