import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { watchesRouter } from "../src/watches/routes";
import { prisma } from "../src/db";
import { runPricePoll, type AlertEvent } from "../src/pricePoller";
import { resetDb } from "./helpers";

const SPACES_ENV_KEYS = [
  "DO_SPACES_ENDPOINT",
  "DO_SPACES_REGION",
  "DO_SPACES_BUCKET",
  "DO_SPACES_ACCESS_KEY",
  "DO_SPACES_SECRET_KEY",
] as const;

function createTestApp() {
  const testApp = express();
  testApp.use(express.json());
  testApp.use((req, _res, next) => {
    const headerUserId = req.header("x-user-id") ?? req.header("x-test-user");
    if (headerUserId) {
      (req as express.Request & { userId?: string }).userId = headerUserId;
    }
    next();
  });
  testApp.use("/api/watches", watchesRouter);
  return testApp;
}

function asUser(testApp: express.Express, userId: string) {
  return {
    get: (url: string) => request(testApp).get(url).set("x-user-id", userId),
    post: (url: string) => request(testApp).post(url).set("x-user-id", userId),
    patch: (url: string) => request(testApp).patch(url).set("x-user-id", userId),
    delete: (url: string) => request(testApp).delete(url).set("x-user-id", userId),
  };
}

describe("Portfolio export, import, prices.csv, and alert recipient behavior", () => {
  const testApp = createTestApp();
  const previousSpacesEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    await resetDb();
    for (const key of SPACES_ENV_KEYS) {
      previousSpacesEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of SPACES_ENV_KEYS) {
      if (previousSpacesEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousSpacesEnv[key];
      }
    }
    vi.restoreAllMocks();
  });

  it("exports user portfolio JSON from GET /api/watches/portfolio.json", async () => {
    const userId = "portfolio-export-user";
    await prisma.user.upsert({
      where: { id: userId },
      update: { email: "exporter@example.com", name: "Exporter User" },
      create: { id: userId, email: "exporter@example.com", name: "Exporter User" },
    });

    await asUser(testApp, userId)
      .post("/api/watches")
      .send({ ticker: "AAPL", purchasePrice: 180, gainPct: 10, lossPct: -5 })
      .expect(201);

    const res = await asUser(testApp, userId)
      .get("/api/watches/portfolio.json")
      .expect(200);

    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.version).toBe(1);
    expect(typeof res.body.exportedAt).toBe("string");
    expect(Array.isArray(res.body.watches)).toBe(true);
    expect(res.body.watches).toEqual(
      expect.arrayContaining([
        {
          ticker: "AAPL",
          purchasePrice: 180,
          gainPct: 10,
          lossPct: -5,
        },
      ]),
    );
  });

  it("imports valid watches via POST /api/watches/portfolio/import and rejects invalid payloads", async () => {
    const userId = "portfolio-import-user";
    await prisma.user.upsert({
      where: { id: userId },
      update: { email: "importer@example.com", name: "Importer User" },
      create: { id: userId, email: "importer@example.com", name: "Importer User" },
    });

    const invalidRes = await asUser(testApp, userId)
      .post("/api/watches/portfolio/import")
      .send({ version: 1, watches: [] })
      .expect(400);

    expect(invalidRes.body).toBeDefined();

    const validRes = await asUser(testApp, userId)
      .post("/api/watches/portfolio/import")
      .send({
        version: 1,
        watches: [
          { ticker: "MSFT", purchasePrice: 410, gainPct: 8, lossPct: -4 },
          { ticker: "NVDA", purchasePrice: 120, gainPct: 15, lossPct: 0 },
        ],
      })
      .expect(201);

    expect(Array.isArray(validRes.body)).toBe(true);
    expect(validRes.body).toHaveLength(2);
    expect(validRes.body.map((w: { ticker: string }) => w.ticker)).toEqual([
      "MSFT",
      "NVDA",
    ]);
  });

  it("serves CSV price history from GET /api/watches/:id/prices.csv and hides another user's watch", async () => {
    const ownerId = "csv-owner-user";
    const otherUserId = "csv-other-user";

    await prisma.user.upsert({
      where: { id: ownerId },
      update: { email: "owner@example.com", name: "Owner User" },
      create: { id: ownerId, email: "owner@example.com", name: "Owner User" },
    });
    await prisma.user.upsert({
      where: { id: otherUserId },
      update: { email: "other@example.com", name: "Other User" },
      create: { id: otherUserId, email: "other@example.com", name: "Other User" },
    });

    const created = await asUser(testApp, ownerId)
      .post("/api/watches")
      .send({ ticker: "AAPL", purchasePrice: 150, gainPct: 10, lossPct: -5 })
      .expect(201);

    const watchId = created.body.id as number;
    expect(watchId).toBeDefined();

    const csvRes = await asUser(testApp, ownerId)
      .get(`/api/watches/${watchId}/prices.csv`)
      .expect(200);

    expect(csvRes.headers["content-type"]).toContain("text/csv");
    expect(csvRes.headers["content-disposition"]).toContain("AAPL-prices.csv");
    expect(csvRes.text.split("\n")[0]?.trim()).toBe("timestamp,price");

    await asUser(testApp, otherUserId)
      .get(`/api/watches/${watchId}/prices.csv`)
      .expect(404);
  });

  it("passes the watch owner's database email as userEmail on triggered gain alerts", async () => {
    const ownerEmail = "custom-owner@example.com";
    const userId = "alert-recipient-user";

    await prisma.user.upsert({
      where: { id: userId },
      update: { email: ownerEmail, name: "Alert User" },
      create: { id: userId, email: ownerEmail, name: "Alert User" },
    });

    const created = await asUser(testApp, userId)
      .post("/api/watches")
      .send({ ticker: "TSLA", purchasePrice: 100, gainPct: 10, lossPct: -5 })
      .expect(201);

    const watchId = created.body.id as number;

    vi.stubEnv("FINNHUB_API_KEY", "test-finnhub-key");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ c: 120 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const alerts: AlertEvent[] = [];
    await runPricePoll(async (event) => {
      alerts.push(event);
    });

    const matchingAlert = alerts.find((a) => a.watchId === watchId);
    expect(matchingAlert).toBeDefined();
    expect(matchingAlert?.userEmail).toBe(ownerEmail);
  });
});