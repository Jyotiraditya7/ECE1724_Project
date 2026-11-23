import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { deletePriceHistoryCsv } from "../src/storage/priceHistory";
import { getSpacesConfig } from "../src/storage/spaces";
import { asUser, createUser, resetDb } from "./helpers";

const HOUR = 60 * 60 * 1000;
const createdAt = new Date("2026-11-10T15:00:00Z");

async function createWatch(userId: string, ticker: string) {
  const res = await asUser(userId)
    .post("/api/watches")
    .send({ ticker, purchasePrice: 100, gainPct: 10, lossPct: -5 });
  await prisma.watch.update({ where: { id: res.body.id }, data: { createdAt } });
  return res.body.id as number;
}

async function addSnapshot(ticker: string, price: number, offsetHours: number) {
  const stock = await prisma.stock.findUniqueOrThrow({ where: { ticker } });
  await prisma.priceSnapshot.create({
    data: { stockId: stock.id, price, timestamp: new Date(createdAt.getTime() + offsetHours * HOUR) },
  });
}

beforeEach(async () => {
  await resetDb();
  await createUser("alice");
  await createUser("bob");
});
afterEach(async () => {
  const config = getSpacesConfig();
  if (config) {
    for (const userId of ["alice", "bob"]) {
      for (const watchId of [1, 2, 3]) {
        try {
          await deletePriceHistoryCsv(userId, watchId, undefined, config);
        } catch {
        }
      }
    }
  }
});

describe("GET /api/watches/:id/prices", () => {
  it("returns the stock's prices since the watch was created, oldest first", async () => {
    const id = await createWatch("alice", "AAPL");
    await addSnapshot("AAPL", 101, 2);
    await addSnapshot("AAPL", 99, -1); // before the watch existed
    await addSnapshot("AAPL", 100, 1);

    const res = await asUser("alice").get(`/api/watches/${id}/prices`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { price: 100, timestamp: "2026-11-10T16:00:00.000Z" },
      { price: 101, timestamp: "2026-11-10T17:00:00.000Z" },
    ]);
  });

  it("only includes prices for the watch's own stock", async () => {
    const id = await createWatch("alice", "AAPL");
    await createWatch("alice", "MSFT");
    await addSnapshot("AAPL", 100, 1);
    await addSnapshot("MSFT", 400, 1);

    const res = await asUser("alice").get(`/api/watches/${id}/prices`);

    expect(res.body.map((p: { price: number }) => p.price)).toEqual([100]);
  });

  it("hides another user's watch behind a 404", async () => {
    const id = await createWatch("alice", "AAPL");
    const res = await asUser("bob").get(`/api/watches/${id}/prices`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/watches/:id/prices.csv", () => {
  it("returns the same price history as CSV rows, oldest first", async () => {
    const id = await createWatch("alice", "AAPL");
    await addSnapshot("AAPL", 101.25, 2);
    await addSnapshot("AAPL", 99, -1); // before the watch existed
    await addSnapshot("AAPL", 100, 1);

    const res = await asUser("alice").get(`/api/watches/${id}/prices.csv`);

    expect(res.status).toBe(200);
    expect(res.text).toBe(
      "timestamp,price\n" +
        "2026-11-10T16:00:00.000Z,100\n" +
        "2026-11-10T17:00:00.000Z,101.25\n",
    );
  });

  it("is served as a CSV file download named after the ticker", async () => {
    const id = await createWatch("alice", "BRK.B");

    const res = await asUser("alice").get(`/api/watches/${id}/prices.csv`);

    expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
    // Quotes around the filename are optional when it has no special characters.
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="?BRK\.B-prices\.csv"?$/);
  });

  it("has only the header row when there is no history yet", async () => {
    const id = await createWatch("alice", "AAPL");

    const res = await asUser("alice").get(`/api/watches/${id}/prices.csv`);

    expect(res.text).toBe("timestamp,price\n");
  });

  it("hides another user's watch behind a 404", async () => {
    const id = await createWatch("alice", "AAPL");
    const res = await asUser("bob").get(`/api/watches/${id}/prices.csv`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Watch not found" });
  });
});
