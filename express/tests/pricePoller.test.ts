import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/db";
import { runPricePoll, type AlertEvent } from "../src/pricePoller";

describe("runPricePoll", () => {
  const previousApiKey = process.env["FINNHUB_API_KEY"];

  beforeEach(() => {
    process.env["FINNHUB_API_KEY"] = "test-finnhub-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (previousApiKey === undefined) {
      delete process.env["FINNHUB_API_KEY"];
    } else {
      process.env["FINNHUB_API_KEY"] = previousApiKey;
    }
  });

  it("includes the watch owner's email from the user relation on gain alerts", async () => {
    vi.spyOn(prisma.stock, "findMany").mockResolvedValue([
      {
        id: 1,
        ticker: "AAPL",
        currentPrice: 200,
        priceUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
        watches: [
          {
            id: 10,
            userId: "alice",
            stockId: 1,
            purchasePrice: 200,
            gainPct: 10,
            lossPct: -5,
            gainNotified: false,
            lossNotified: false,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            user: { email: "alice@example.com" },
          },
        ],
      },
    ] as never);

    vi.spyOn(prisma.stock, "update").mockResolvedValue({} as never);
    vi.spyOn(prisma.priceSnapshot, "create").mockResolvedValue({} as never);
    vi.spyOn(prisma.watch, "update").mockResolvedValue({} as never);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (ops: unknown) => {
      if (Array.isArray(ops)) {
        return Promise.all(ops);
      }
      if (typeof ops === "function") {
        return ops(prisma);
      }
      return undefined;
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ c: 230 }),
    } as Response);

    const alerts: AlertEvent[] = [];
    await runPricePoll((event) => {
      alerts.push(event);
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: "gain",
      watchId: 10,
      userId: "alice",
      userEmail: "alice@example.com",
      ticker: "AAPL",
      currentPrice: 230,
      purchasePrice: 200,
      changePct: 15,
    });
  });

  it("skips polling when FINNHUB_API_KEY is not set", async () => {
    delete process.env["FINNHUB_API_KEY"];
    const findManySpy = vi.spyOn(prisma.stock, "findMany");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await runPricePoll(vi.fn());

    expect(findManySpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});