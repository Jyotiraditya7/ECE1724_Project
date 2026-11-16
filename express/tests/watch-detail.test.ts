import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { asUser, createUser, resetDb } from "./helpers";

const ALICE = "alice";
const BOB = "bob";

const validWatch = { ticker: "AAPL", purchasePrice: 200, gainPct: 10, lossPct: -5 };

beforeEach(async () => {
  await resetDb();
  await createUser(ALICE);
  await createUser(BOB);
});

describe("GET /api/watches/:id", () => {
  it("returns the user's own watch", async () => {
    const created = await asUser(ALICE).post("/api/watches").send(validWatch);
    const res = await asUser(ALICE).get(`/api/watches/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it("hides another user's watch behind a 404", async () => {
    const created = await asUser(ALICE).post("/api/watches").send(validWatch);
    const res = await asUser(BOB).get(`/api/watches/${created.body.id}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Watch not found" });
  });

  it("returns 404 for a watch that does not exist", async () => {
    const res = await asUser(ALICE).get("/api/watches/999");
    expect(res.status).toBe(404);
  });

  it("rejects a non-numeric id", async () => {
    const res = await asUser(ALICE).get("/api/watches/abc");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/watches/:id", () => {
  it("updates thresholds and clears the notification status", async () => {
    const created = await asUser(ALICE).post("/api/watches").send(validWatch);
    await prisma.watch.update({
      where: { id: created.body.id },
      data: { gainNotified: true, lossNotified: true },
    });

    const res = await asUser(ALICE)
      .patch(`/api/watches/${created.body.id}`)
      .send({ gainPct: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      gainPct: 20,
      purchasePrice: 200,
      gainNotified: false,
      lossNotified: false,
    });
  });

  it("rejects an empty update", async () => {
    const created = await asUser(ALICE).post("/api/watches").send(validWatch);
    const res = await asUser(ALICE).patch(`/api/watches/${created.body.id}`).send({});
    expect(res.status).toBe(400);
  });

  it("applies the same validation rules as create", async () => {
    const created = await asUser(ALICE).post("/api/watches").send(validWatch);
    const res = await asUser(ALICE)
      .patch(`/api/watches/${created.body.id}`)
      .send({ lossPct: 3 });
    expect(res.status).toBe(400);
  });

  it("cannot edit another user's watch", async () => {
    const created = await asUser(ALICE).post("/api/watches").send(validWatch);
    const res = await asUser(BOB)
      .patch(`/api/watches/${created.body.id}`)
      .send({ gainPct: 50 });
    expect(res.status).toBe(404);
    const unchanged = await prisma.watch.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(unchanged.gainPct).toBe(10);
  });
});

describe("DELETE /api/watches/:id", () => {
  it("deletes the user's own watch", async () => {
    const created = await asUser(ALICE).post("/api/watches").send(validWatch);
    const res = await asUser(ALICE).delete(`/api/watches/${created.body.id}`);
    expect(res.status).toBe(204);
    expect(await prisma.watch.count()).toBe(0);
  });

  it("cannot delete another user's watch", async () => {
    const created = await asUser(ALICE).post("/api/watches").send(validWatch);
    const res = await asUser(BOB).delete(`/api/watches/${created.body.id}`);
    expect(res.status).toBe(404);
    expect(await prisma.watch.count()).toBe(1);
  });
});
