import request from "supertest";
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

/** supertest requests that act as the given user. */
export function asUser(userId: string) {
  return {
    get: (url: string) => request(app).get(url).set("x-test-user", userId),
    post: (url: string) => request(app).post(url).set("x-test-user", userId),
    patch: (url: string) => request(app).patch(url).set("x-test-user", userId),
    delete: (url: string) => request(app).delete(url).set("x-test-user", userId),
  };
}
