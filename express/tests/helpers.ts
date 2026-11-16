import { createApp } from "../src/app";
import { prisma } from "../src/db";

/**
 * App instance for tests. Instead of a real login, each request names its
 * user in the `x-test-user` header, so tests can act as different users.
 */
export const app = createApp({
  resolveUserId: async (req) => req.header("x-test-user") ?? null,
});

/** Empty every table so each test starts from a clean database. */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "PriceSnapshot", "Watch", "Stock", "user" RESTART IDENTITY CASCADE',
  );
}

export async function createUser(id: string) {
  return prisma.user.create({
    data: { id, name: id, email: `${id}@example.com` },
  });
}
