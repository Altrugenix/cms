import { defineConfig } from "vitepress";

export default defineConfig({
  base: process.env.DOCS_BASE || "/arche-cms/",
  cleanUrls: true,
  description: "File-based, open-source, developer-first headless CMS",
  lang: "en-US",
  lastUpdated: true,
  themeConfig: {
    footer: {
      copyright: "Copyright 2026 Arche CMS",
      message: "Released under the MIT License.",
    },

    logo: "/logo.svg",

    nav: [
      { activeMatch: "/guide/", link: "/guide/getting-started", text: "Guide" },
      { activeMatch: "/reference/", link: "/reference/api", text: "Reference" },
      {
        items: [
          { link: "/changelog", text: "Changelog" },
          { link: "/contributing", text: "Contributing" },
          { link: "https://github.com/Arche-CMS/arche-cms", text: "GitHub" },
        ],
        text: "v0.1.0",
      },
    ],

    search: {
      provider: "local",
    },

    sidebar: {
      "/guide/": [
        {
          items: [
            { link: "/guide/introduction", text: "Introduction" },
            { link: "/guide/getting-started", text: "Getting Started" },
            { link: "/guide/architecture", text: "Architecture" },
          ],
          text: "Getting Started",
        },
        {
          items: [
            { link: "/guide/schemas", text: "Schemas" },
            { link: "/guide/field-types", text: "Field Types" },
            { link: "/guide/plugins", text: "Plugins" },
            { link: "/guide/storage", text: "Storage" },
          ],
          text: "Core Concepts",
        },
        {
          items: [{ link: "/guide/cli-usage", text: "CLI Usage" }],
          text: "CLI",
        },
        {
          items: [{ link: "/guide/deployment", text: "Deployment Guide" }],
          text: "Deployment",
        },
      ],

      "/reference/": [
        {
          items: [
            { link: "/reference/api", text: "REST API" },
            { link: "/reference/graphql", text: "GraphQL API" },
            { link: "/reference/sdk", text: "TypeScript SDK" },
          ],
          text: "API Reference",
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/Arche-CMS/arche-cms" }],
  },

  title: "Arche CMS",
});
