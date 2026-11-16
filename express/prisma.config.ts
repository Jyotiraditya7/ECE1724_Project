import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read lazily so `prisma generate` (run on npm install) works before a
    // .env file exists; migrate/seed fail clearly if it is still missing.
    url: process.env["DATABASE_URL"] ?? "",
  },
});
