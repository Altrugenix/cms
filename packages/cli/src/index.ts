#!/usr/bin/env node

/* eslint-disable no-console */

import { collectionCreate, printCollectionCreateHelp } from "./commands/collection.js";
import { pluginCreate, printPluginCreateHelp } from "./commands/plugin.js";
import { dev, printDevHelp } from "./commands/dev.js";
import { start, printStartHelp } from "./commands/start.js";
import { build, printBuildHelp } from "./commands/build.js";
import { migrate, printMigrateHelp } from "./commands/migrate.js";
import { generate, printGenerateHelp } from "./commands/generate.js";
import { typegen, printTypegenHelp } from "./commands/typegen.js";
import { lint, printLintHelp } from "./commands/lint.js";
import { doctor, printDoctorHelp } from "./commands/doctor.js";

function printMainHelp(): void {
  console.log(`
Usage: cms <command> [options]

Commands:
  dev                  Start the CMS dev server with file watching (hot-reload)
  start                Start the CMS production server (no file watching)
  build                Build CMS for production
  migrate              Run database migrations
  generate             Run code generation pipeline
  typegen              Generate TypeScript types from schemas
  lint                 Lint schema definitions
  doctor               Check project health
  collection create    Scaffold a new collection
  plugin create        Scaffold a new plugin

Options:
  --help               Show help for any command

Run "cms <command> --help" for command-specific help.
`);
}

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
    port?: number;
    host?: string;
    dir?: string;
    dbUrl?: string;
    dbAdapter?: string;
  } {
    const portIdx = args.indexOf("--port");
    const hostIdx = args.indexOf("--host");
    const dirIdx = args.indexOf("--dir");
    const dbUrlIdx = args.indexOf("--db-url");
    const dbAdapterIdx = args.indexOf("--db-adapter");
    return {
      port: portIdx !== -1 ? Number(args[portIdx + 1]) : undefined,
      host: hostIdx !== -1 ? args[hostIdx + 1] : undefined,
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      dbUrl: dbUrlIdx !== -1 ? args[dbUrlIdx + 1] : undefined,
      dbAdapter: dbAdapterIdx !== -1 ? args[dbAdapterIdx + 1] : undefined,
    };
  }

  if (cmd === "dev") {
    if (hasHelp) {
      printDevHelp();
      return;
    }
    dev(parseDevFlags()).catch((err: Error) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
  } else if (cmd === "start") {
    if (hasHelp) {
      printStartHelp();
      return;
    }
    start(parseDevFlags()).catch((err: Error) => {
      console.error("Error:", err.message);
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
    }).catch((err: Error) => {
      console.error("Error:", err.message);
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
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      db: dbIdx !== -1 ? args[dbIdx + 1] : undefined,
    }).catch((err: Error) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
  } else if (cmd === "generate") {
    if (hasHelp) {
      printGenerateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    const outIdx = args.indexOf("--out");
    generate({
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
      out: outIdx !== -1 ? args[outIdx + 1] : undefined,
    }).catch((err: Error) => {
      console.error("Error:", err.message);
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
    }).catch((err: Error) => {
      console.error("Error:", err.message);
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
    }).catch((err: Error) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
  } else if (cmd === "doctor") {
    if (hasHelp) {
      printDoctorHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    doctor({ dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined }).catch((err: Error) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
  } else if (cmd === "collection" && sub === "create") {
    if (hasHelp) {
      printCollectionCreateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    collectionCreate({
      slug: args[2] ?? "",
      dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined,
    }).catch((err: Error) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
  } else if (cmd === "plugin" && sub === "create") {
    if (hasHelp) {
      printPluginCreateHelp();
      return;
    }
    const dirIdx = args.indexOf("--dir");
    pluginCreate({ slug: args[2] ?? "", dir: dirIdx !== -1 ? args[dirIdx + 1] : undefined }).catch(
      (err: Error) => {
        console.error("Error:", err.message);
        process.exit(1);
      },
    );
  } else {
    console.error(`Unknown command: ${cmd} ${sub ?? ""}`);
    printMainHelp();
    process.exit(1);
  }
}

parseArgs();
