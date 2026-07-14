import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Arche CMS",
  description: "File-based, open-source, developer-first headless CMS",
  lang: "en-US",
  lastUpdated: true,
  cleanUrls: true,
  base: process.env.DOCS_BASE || "/cms/",

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      { text: "Reference", link: "/reference/api", activeMatch: "/reference/" },
      {
        text: "v0.1.0",
        items: [
          { text: "Changelog", link: "/changelog" },
          { text: "Contributing", link: "/contributing" },
          { text: "GitHub", link: "https://github.com/Arche-CMS/arche-cms" },
        ],
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Architecture", link: "/guide/architecture" },
          ],
        },
        {
          text: "Core Concepts",
          items: [
            { text: "Schemas", link: "/guide/schemas" },
            { text: "Field Types", link: "/guide/field-types" },
            { text: "Plugins", link: "/guide/plugins" },
            { text: "Storage", link: "/guide/storage" },
          ],
        },
        {
          text: "CLI",
          items: [{ text: "CLI Usage", link: "/guide/cli-usage" }],
        },
        {
          text: "Deployment",
          items: [{ text: "Deployment Guide", link: "/guide/deployment" }],
        },
      ],

      "/reference/": [
        {
          text: "API Reference",
          items: [
            { text: "REST API", link: "/reference/api" },
            { text: "GraphQL API", link: "/reference/graphql" },
            { text: "TypeScript SDK", link: "/reference/sdk" },
          ],
        },
        {
          text: "Package Reference",
          items: [
            { text: "Schema API", link: "/reference/schema" },
            { text: "Plugin API", link: "/reference/plugin-api" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/Arche-CMS/arche-cms" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright 2026 Arche CMS",
    },

    search: {
      provider: "local",
    },
  },
});
