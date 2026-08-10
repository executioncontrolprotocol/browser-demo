import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    dedupe: ["@executioncontrolprotocol/core", "@executioncontrolprotocol/types"],
  },
  test: {
    globals: false,
    include: ["test/**/*.test.ts"],
  },
})
