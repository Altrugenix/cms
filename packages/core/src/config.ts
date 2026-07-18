import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface ConfigLoaderOptions {
  cwd?: string | undefined;
  envPrefix?: string | undefined;
  configFile?: string | undefined;
}

function parseEnvValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value === "undefined") return undefined;
  const num = Number(value);
  if (!Number.isNaN(num) && value.trim() !== "") return num;
  return value;
}

export function createConfigLoader(options?: ConfigLoaderOptions) {
  const cwd = options?.cwd ?? process.cwd();
  const envPrefix = options?.envPrefix ?? "CMS_";
  const configFile = options?.configFile ?? "cms.config.json";

  async function loadEnv(): Promise<Record<string, unknown>> {
    const config: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(envPrefix) && value !== undefined) {
        const configKey = key
          .slice(envPrefix.length)
          .toLowerCase()
          .replace(/_([a-z])/g, (_match: string, c: string) => c.toUpperCase());
        config[configKey] = parseEnvValue(value);
      }
    }
    return config;
  }

  async function loadFile(): Promise<Record<string, unknown>> {
    const filePath = resolve(cwd, configFile);
    if (!existsSync(filePath)) return {};
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  }

  async function load(): Promise<Record<string, unknown>> {
    const [fileConfig, envConfig] = await Promise.all([loadFile(), loadEnv()]);
    return { ...fileConfig, ...envConfig };
  }

  return { load, loadEnv, loadFile };
}
