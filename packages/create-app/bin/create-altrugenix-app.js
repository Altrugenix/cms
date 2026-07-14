#!/usr/bin/env node

import("../dist/index.js").catch((err) => {
  console.error("Failed to load:", err.message);
  process.exit(1);
});
