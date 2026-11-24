import "dotenv/config";
import { defineConfig } from "vitest/config";

const testDatabaseUrl = process.env["TEST_DATABASE_URL"];
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is not set. Copy .env.example to .env first.");
}

export default defineConfig({
  test: {
    // Point the app's Prisma client at the test database, never the dev one.
    env: {
      DATABASE_URL: testDatabaseUrl,
      FINNHUB_API_KEY: "",
      DO_SPACES_ENDPOINT: "",
      DO_SPACES_REGION: "",
      DO_SPACES_BUCKET: "",
      DO_SPACES_ACCESS_KEY: "",
      DO_SPACES_SECRET_KEY: "",
    },
    globalSetup: ["tests/globalSetup.ts"],
    // Test files share one database, so run them one at a time.
    fileParallelism: false,
  },
});
