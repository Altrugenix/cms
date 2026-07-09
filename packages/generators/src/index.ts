export { generateTypes, generateTypesToFile } from "./typegen.js";
export type { TypeGenOptions } from "./typegen.js";

export type { Generator, GeneratedFile, GenerationOptions } from "./generator.js";
export { GenerationPipeline } from "./pipeline.js";

import { apiRoutesGenerator } from "./api-routes.js";
import { validationGenerator } from "./validation.js";
import { migrationGenerator } from "./migrations.js";
import { graphqlGenerator } from "./graphql-schema.js";
import { openApiGenerator } from "./openapi.js";
import { sdkGenerator } from "./sdk.js";
import { adminFormGenerator } from "./admin-forms.js";

export { apiRoutesGenerator };
export { validationGenerator };
export { migrationGenerator };
export { graphqlGenerator };
export { openApiGenerator };
export { sdkGenerator };
export { adminFormGenerator };

export const allGenerators = [
  apiRoutesGenerator,
  validationGenerator,
  migrationGenerator,
  graphqlGenerator,
  openApiGenerator,
  sdkGenerator,
  adminFormGenerator,
];
