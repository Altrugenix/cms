export function collectionTemplate(slug: string): string {
  const pascal = toPascal(slug);
  return `import { defineCollection, text, slug } from "@arche-cms/schema";

export default defineCollection({
  slug: "${slug}",
  labels: { singular: "${pascal}", plural: "${pascal}s" },
  fields: [
    text("title", { label: "Title", validation: { required: true } }),
  ],
});
`;
}

export function pluginTemplate(slug: string): { files: Record<string, string> } {
  const pascal = toPascal(slug);
  return {
    files: {
      "package.json": JSON.stringify(
        {
          dependencies: {
            "@arche-cms/types": "workspace:*",
          },
          files: ["dist"],
          main: "dist/index.js",
          name: `@arche-cms/plugin-${slug}`,
          peerDependencies: {
            "@arche-cms/core": "workspace:*",
          },
          private: true,
          scripts: {
            build: "tsc",
            clean: "rm -rf dist",
            dev: "tsc --watch",
          },
          type: "module",
          types: "dist/index.d.ts",
          version: "0.0.1",
        },
        null,
        2,
      ),
      "src/index.ts": `import type { PluginDefinition } from "@arche-cms/types";

const plugin: PluginDefinition = {
  slug: "${slug}",
  name: "${pascal}",
  description: "TODO: Describe your plugin",
  version: "0.0.1",
  hooks: {
    afterSchemaLoad: async (_context) => {
      // TODO: Add your plugin logic here
    },
  },
};

export default plugin;
`,
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: { outDir: "dist", rootDir: "src" },
          extends: "../../tsconfig.base.json",
          include: ["src"],
          references: [{ path: "../types" }, { path: "../core" }],
        },
        null,
        2,
      ),
    },
  };
}

export function collectionCreateHelp(): string {
  return `Usage: cms collection create <slug> [options]

Create a new collection in the CMS.

Arguments:
  slug                    Collection slug (e.g. "blog-posts")

Options:
  --fields <fields>       Comma-separated field names (default: "title")
  --dir <path>            Output directory (default: "cms/collections")
  --help                  Show this help

Example:
  cms collection create blog-posts
  cms collection create blog-posts --fields title,body,published
`;
}

export function pluginCreateHelp(): string {
  return `Usage: cms plugin create <slug> [options]

Create a new plugin package.

Arguments:
  slug                    Plugin slug (e.g. "my-plugin")

Options:
  --dir <path>            Output directory (default: "packages/plugins")
  --help                  Show this help

Example:
  cms plugin create seo
  cms plugin create my-plugin
`;
}

function toPascal(s: string): string {
  return s.replace(/(^\w|[-_]\w)/g, (c) => c.replace(/[-_]/g, "").toUpperCase());
}
