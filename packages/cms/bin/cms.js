#!/usr/bin/env node

import("../dist/index.js")
  .then((mod) => {
    if (typeof mod.main === "function") {
      return mod.main();
    }
  })
  .catch((err) => {
    console.error("Failed to load CLI:", err.message);
    process.exit(1);
  });
