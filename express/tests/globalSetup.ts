import { execSync } from "node:child_process";

/** Bring the test database's schema up to date once before any test runs. */
export default function setup() {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env["TEST_DATABASE_URL"] },
  });
}
