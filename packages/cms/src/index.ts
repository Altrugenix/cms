/* eslint-disable no-console */

import { config } from "dotenv";
config();
import { build, printBuildHelp } from "./commands/build.js";
import { collectionCreate, printCollectionCreateHelp } from "./commands/collection.js";
import { dev, printDevHelp } from "./commands/dev.js";
import { doctor, printDoctorHelp } from "./commands/doctor.js";
import {
  firebaseSetup,
  firebaseDeployRules,
  firebaseDeployIndexes,
  printFirebaseHelp,
} from "./commands/firebase.js";
import { generate, printGenerateHelp } from "./commands/generate.js";
import { lint, printLintHelp } from "./commands/lint.js";
import { migrate, printMigrateHelp } from "./commands/migrate.js";
import { pluginCreate, printPluginCreateHelp } from "./commands/plugin.js";
import { start, printStartHelp } from "./commands/start.js";
import { typegen, printTypegenHelp } from "./commands/typegen.js";

export interface CmsUserConfig {
  database: {
    adapter: "sqlite" | "postgres";
    url?: string;
  };
  localization?:
    | {
        defaultLocale: string;
      }
    | undefined;
  server?:
    | {
        port?: number | undefined;
        host?: string | undefined;
      }
    | undefined;
  storage?:
    | {
        baseDir?: string | undefined;
      }
    | undefined;
}

export function defineConfig(config: CmsUserConfig): CmsUserConfig {
  return config;
}

function printMainHelp(): void {
  console.log(`
Usage: cms <command> [options]

Commands:
  dev                  Start the CMS dev server with file watching (hot-reload)
  start                Start the CMS production server (no file watching)
  build                Build CMS for production
  migrate              Run database migrations
  generate             Run code generation pipelines
  generate:types       Generate TypeScript types only
  generate:sdk         Generate typed SDK client only
  generate:validation  Generate Zod validation schemas only
  typegen              Generate TypeScript types from schemas (alias for generate:types)
  lint                 Lint schema definitions
  doctor               Check project health
  collection create    Scaffold a new collection
  plugin create        Scaffold a new plugin
  firebase setup       Interactive Firebase project setup wizard
  firebase deploy-rules   Deploy Firestore/Storage security rules
  firebase deploy-indexes Deploy Firestore composite indexes

Options:
  --help               Show help for any command
`);
}

/* v8 ignore start — parseArgs is untested CLI glue that dispatches to command modules */
function parseArgs(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help") {
    printMainHelp();
    process.exit(0);
  }

  const cmd = args[0];
  const sub = args[1];

  const hasHelp = args.includes("--help");

  function parseDevFlags(): {
    port?: number | undefined;
    host?: string | undefined;
    dir?: string | undefined;
    dbUrl?: string | undefined;
    dbAdapter?: string | undefined;
    vite?: boolean | undefined;
  } {
    const portIdx = args.indexOf("--port");
    const hostIdx = args.indexOf("--host");
    const dirIdx = args.indexOf("--dir");
    const dbUrlIdx = args.indexOf("--db-url");
    const dbAdapterIdx = args.indexOf("--db-adapter");
    return {
      dbAdapter: dbAdapterIdx !== -1 ? args[dbAdapterIdx + 1] : undefined,
      dbUrl: dbUrlIdx !== -1 ? args[dbUrlIdx + 1] : undefined,
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      host: hostIdx !== -1 ? args[hostIdx + 1] : undefined,
      port: portIdx !== -1 ? Number(args[portIdx + 1]) : undefined,
      vite: args.includes("--vite"),
    };
  }

  if (cmd === "dev") {
    if (hasHelp) {
      printDevHelp();
      return;
    }
    dev(parseDevFlags()).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "start") {
    if (hasHelp) {
      printStartHelp();
      return;
    }
    start(parseDevFlags()).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "build") {
    if (hasHelp) {
      printBuildHelp();
      return;
    }
    const outDirIdx = args.indexOf("--out-dir");
    build({
      clean: args.includes("--clean"),
      outDir: outDirIdx !== -1 ? args[outDirIdx + 1] : undefined,
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "migrate") {
    if (hasHelp) {
      printMigrateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    const dbIdx = args.indexOf("--db");
    migrate({
      db: dbIdx !== -1 ? args[dbIdx + 1] : undefined,
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "generate") {
    if (hasHelp) {
      printGenerateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    const outIdx = args.indexOf("--out");
    const gensIdx = args.indexOf("--generators");
    const genList: string[] | undefined =
      gensIdx !== -1 ? args[gensIdx + 1]?.split(",").filter(Boolean) : undefined;
    generate({
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      generators: genList,
      hooks: args.includes("--hooks"),
      out: outIdx !== -1 ? args[outIdx + 1] : undefined,
      sdk: args.includes("--sdk"),
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "generate:types") {
    if (hasHelp) {
      printGenerateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    const outIdx = args.indexOf("--out");
    generate({
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      generators: ["types"],
      out: outIdx !== -1 ? args[outIdx + 1] : undefined,
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "generate:sdk") {
    if (hasHelp) {
      printGenerateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    const outIdx = args.indexOf("--out");
    generate({
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      generators: ["sdk"],
      out: outIdx !== -1 ? args[outIdx + 1] : undefined,
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "generate:validation") {
    if (hasHelp) {
      printGenerateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    const outIdx = args.indexOf("--out");
    generate({
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      generators: ["validation"],
      out: outIdx !== -1 ? args[outIdx + 1] : undefined,
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "generate:hooks") {
    if (hasHelp) {
      printGenerateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    const outIdx = args.indexOf("--out");
    generate({
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      generators: ["hooks"],
      out: outIdx !== -1 ? args[outIdx + 1] : undefined,
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "typegen") {
    if (hasHelp) {
      printTypegenHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    const outIdx = args.indexOf("--out");
    typegen({
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      out: outIdx !== -1 ? args[outIdx + 1] : undefined,
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "lint") {
    if (hasHelp) {
      printLintHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    lint({
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      fix: args.includes("--fix"),
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "doctor") {
    if (hasHelp) {
      printDoctorHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    doctor({ dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "collection" && sub === "create") {
    if (hasHelp) {
      printCollectionCreateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    collectionCreate({
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      slug: args[2] ?? "",
    }).catch((err: unknown) => {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  } else if (cmd === "plugin" && sub === "create") {
    if (hasHelp) {
      printPluginCreateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    pluginCreate({ dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined, slug: args[2] ?? "" }).catch(
      (err: unknown) => {
        console.error("Error:", err instanceof Error ? err.message : String(err));
        process.exit(1);
      },
    );
  } else if (cmd === "firebase") {
    if (hasHelp || !sub || sub === "--help") {
      printFirebaseHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    const projectIdx = args.indexOf("--project");
    const firebaseOpts = {
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      project: projectIdx !== -1 ? args[projectIdx + 1] : undefined,
    };

    if (sub === "setup") {
      firebaseSetup(firebaseOpts).catch((err: unknown) => {
        console.error("Error:", err instanceof Error ? err.message : String(err));
        process.exit(1);
      });
    } else if (sub === "deploy-rules") {
      firebaseDeployRules(firebaseOpts).catch((err: unknown) => {
        console.error("Error:", err instanceof Error ? err.message : String(err));
        process.exit(1);
      });
    } else if (sub === "deploy-indexes") {
      firebaseDeployIndexes(firebaseOpts).catch((err: unknown) => {
        console.error("Error:", err instanceof Error ? err.message : String(err));
        process.exit(1);
      });
    } else {
      console.error(`Unknown firebase command: ${sub}`);
      printFirebaseHelp();
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${cmd} ${sub ?? ""}`);
    printMainHelp();
    process.exit(1);
  }
}
/* v8 ignore stop */

export function main(): void {
  parseArgs();
}
