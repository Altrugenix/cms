/* eslint-disable no-console */

import { readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";

function getFirebaseConfigTemplate(): string {
  const vars = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_MEASUREMENT_ID",
  ];
  const lines = [
    "# Firebase Configuration",
    "# Get these values from Firebase Console > Project Settings > General",
    "",
    ...vars.map((v) => `${v}=`),
    "VITE_BACKEND_MODE" + "=" + "firebase",
  ];
  return lines.join("\n") + "\n";
}

const FIREBASE_JSON_TEMPLATE = {
  emulators: {
    auth: {
      port: 9099,
    },
    firestore: {
      port: 8080,
    },
    storage: {
      port: 9199,
    },
    ui: {
      enabled: true,
      port: 4000,
    },
  },
  firestore: {
    indexes: "firestore.indexes.json",
    rules: "firestore.rules",
  },
  storage: {
    rules: "storage.rules",
  },
};

export interface FirebaseSetupOptions {
  project?: string | undefined;
  dir?: string | undefined;
}

export async function firebaseSetup(options: FirebaseSetupOptions): Promise<void> {
  const dir = resolve(options.dir ?? process.cwd());

  console.log("Setting up Firebase for Arche CMS...\n");

  // Check if .env.local exists and add Firebase vars
  const envLocalPath = resolve(dir, ".env.local");

  try {
    await access(envLocalPath);
    console.log(`  .env.local already exists — skipping`);
  } catch {
    await writeFile(envLocalPath, getFirebaseConfigTemplate(), "utf-8");
    console.log(`  Created .env.local with Firebase configuration template`);
  }

  // Create firebase.json if it doesn't exist
  const firebaseJsonPath = resolve(dir, "firebase.json");
  try {
    await access(firebaseJsonPath);
    console.log(`  firebase.json already exists — skipping`);
  } catch {
    await writeFile(
      firebaseJsonPath,
      JSON.stringify(FIREBASE_JSON_TEMPLATE, null, 2) + "\n",
      "utf-8",
    );
    console.log(`  Created firebase.json with emulator configuration`);
  }

  // Copy firestore.rules and storage.rules from @arche-cms/cms-firebase if available
  const rulesSource = resolve(dir, "node_modules/@arche-cms/cms-firebase/firestore.rules");
  const storageRulesSource = resolve(dir, "node_modules/@arche-cms/cms-firebase/storage.rules");
  const indexesSource = resolve(dir, "node_modules/@arche-cms/cms-firebase/firestore.indexes.json");

  try {
    await access(rulesSource);
    const rules = await readFile(rulesSource, "utf-8");
    await writeFile(resolve(dir, "firestore.rules"), rules, "utf-8");
    console.log(`  Copied firestore.rules from @arche-cms/cms-firebase`);
  } catch {
    console.log(`  firestore.rules not found in @arche-cms/cms-firebase — skipping`);
  }

  try {
    await access(storageRulesSource);
    const rules = await readFile(storageRulesSource, "utf-8");
    await writeFile(resolve(dir, "storage.rules"), rules, "utf-8");
    console.log(`  Copied storage.rules from @arche-cms/cms-firebase`);
  } catch {
    console.log(`  storage.rules not found in @arche-cms/cms-firebase — skipping`);
  }

  try {
    await access(indexesSource);
    const indexes = await readFile(indexesSource, "utf-8");
    await writeFile(resolve(dir, "firestore.indexes.json"), indexes, "utf-8");
    console.log(`  Copied firestore.indexes.json from @arche-cms/cms-firebase`);
  } catch {
    console.log(`  firestore.indexes.json not found in @arche-cms/cms-firebase — skipping`);
  }

  console.log(`\nFirebase setup complete!`);
  console.log(`\nNext steps:`);
  console.log(`  1. Fill in your Firebase project values in .env.local`);
  console.log(`  2. Start the Firebase emulator: firebase emulators:start`);
  console.log(`  3. Start the CMS dev server: pnpm dev`);
}

export async function firebaseDeployRules(options: FirebaseSetupOptions): Promise<void> {
  const dir = resolve(options.dir ?? process.cwd());
  console.log("Deploying Firebase Security Rules...");

  const { execSync } = await import("node:child_process");

  try {
    execSync("firebase deploy --only firestore:rules,storage", {
      cwd: dir,
      stdio: "inherit",
    });
    console.log("\nRules deployed successfully!");
  } catch {
    console.error("\nFailed to deploy rules. Make sure Firebase CLI is installed and configured.");
    process.exit(1);
  }
}

export async function firebaseDeployIndexes(options: FirebaseSetupOptions): Promise<void> {
  const dir = resolve(options.dir ?? process.cwd());
  console.log("Deploying Firestore Indexes...");

  const { execSync } = await import("node:child_process");

  try {
    execSync("firebase deploy --only firestore:indexes", {
      cwd: dir,
      stdio: "inherit",
    });
    console.log("\nIndexes deployed successfully!");
  } catch {
    console.error(
      "\nFailed to deploy indexes. Make sure Firebase CLI is installed and configured.",
    );
    process.exit(1);
  }
}

export function printFirebaseHelp(): void {
  console.log(`
Usage: cms firebase <command> [options]

Commands:
  setup              Interactive Firebase project setup wizard
  deploy-rules       Deploy Firestore and Storage security rules
  deploy-indexes     Deploy Firestore composite indexes

Options:
  --project          Firebase project ID (default: from .firebaserc)
  --dir              Working directory (default: current directory)
  --help             Show help for this command
`);
}
