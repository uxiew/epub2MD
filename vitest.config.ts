import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: 'test/utilities/setup-temp-dir.ts'
  },
})
