import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

// Prisma migrate reads `?schema=` from the URL, but the pg driver adapter
// needs it passed separately, so split it out here to keep both in sync.
const url = new URL(databaseUrl);
const schema = url.searchParams.get("schema") ?? undefined;
url.searchParams.delete("schema");

/** The single Prisma client shared by the whole backend. */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.toString() }, schema ? { schema } : {}),
});
