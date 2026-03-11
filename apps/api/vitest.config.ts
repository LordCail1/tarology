import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sharedSourceEntry = fileURLToPath(
  new URL("../../packages/shared/src/index.ts", import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: {
      "@tarology/shared": sharedSourceEntry,
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
