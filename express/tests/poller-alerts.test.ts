import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "../src/db";
import { runPricePoll, startPricePoller, type AlertEvent } from "../src/pricePoller";
import { createUser, resetDb } from "./helpers";

describe("Poller & Finnhub Edge Cases", () => {
  const originalApiKey = process.env["FINNHUB_API_KEY"];

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env["FINNHUB_API_KEY"] = "test-finnhub-key";
    await resetDb();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) {
      delete process.env["FINNHUB_API_KEY"];
    } else {
      process.env["FINNHUB_API_KEY"] = originalApiKey;
    }
    await resetDb();
  });

  it("skips invalid or delisted tickers cleanly without crashing subsequent polls", async () => {
    await createUser("u1");
    const stock = await prisma.stock.create({
      data: { ticker: "INVALIDTICKER" },
    });
    const watch = await prisma.watch.create({
      data: {
        userId: "u1",
        stockId: stock.id,
        purchasePrice: 100,
        gainPct: 5,
        lossPct: -5,
      },
    });

    const onAlert = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ c: 0, d: null, dp: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ c: 120 }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await runPricePoll(onAlert);

    const afterBadPoll = await prisma.watch.findUnique({ where: { id: watch.id } });
    expect(afterBadPoll?.gainNotified).toBe(false);
    expect(onAlert).not.toHaveBeenCalled();

    await runPricePoll(onAlert);

    const afterGoodPoll = await prisma.watch.findUnique({ where: { id: watch.id } });
    expect(afterGoodPoll?.gainNotified).toBe(true);
    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "gain",
        watchId: watch.id,
        ticker: "INVALIDTICKER",
        currentPrice: 120,
      }),
    );
  });

  it("survives 429, 500, and network errors without altering notification flags or stopping interval", async () => {
    await createUser("u1");
    const stock = await prisma.stock.create({
      data: { ticker: "AAPL" },
    });
    const watch = await prisma.watch.create({
      data: {
        userId: "u1",
        stockId: stock.id,
        purchasePrice: 100,
        gainPct: 10,
        lossPct: -10,
      },
    });

    const onAlert = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockRejectedValueOnce(new Error("Request timeout"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ c: 115 }) });
    vi.stubGlobal("fetch", fetchMock);

    await runPricePoll(onAlert);
    await runPricePoll(onAlert);
    await runPricePoll(onAlert);

    const midWatch = await prisma.watch.findUnique({ where: { id: watch.id } });
    expect(midWatch?.gainNotified).toBe(false);
    expect(midWatch?.lossNotified).toBe(false);
    expect(onAlert).not.toHaveBeenCalled();

    await runPricePoll(onAlert);

    const afterWatch = await prisma.watch.findUnique({ where: { id: watch.id } });
    expect(afterWatch?.gainNotified).toBe(true);
    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "gain", currentPrice: 115 }),
    );

    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const stop = startPricePoller({ intervalMs: 60_000, onAlert: vi.fn() });
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    stop();
    await new Promise((resolve) => setTimeout(resolve, 20));
    setIntervalSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("prevents duplicate alerts while past threshold and does not auto-reset flags inside bounds", async () => {
    await createUser("u1");
    const stock = await prisma.stock.create({
      data: { ticker: "MSFT" },
    });
    const watch = await prisma.watch.create({
      data: {
        userId: "u1",
        stockId: stock.id,
        purchasePrice: 100,
        gainPct: 10,
        lossPct: -10,
      },
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const alerts: AlertEvent[] = [];
    const onAlert = vi.fn((ev: AlertEvent) => {
      alerts.push(ev);
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ c: 120 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ c: 130 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ c: 102 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ c: 125 }) });
    vi.stubGlobal("fetch", fetchMock);

    await runPricePoll(onAlert);
    await runPricePoll(onAlert);
    await runPricePoll(onAlert);
    await runPricePoll(onAlert);

    expect(errorSpy).not.toHaveBeenCalled();

    const finalWatch = await prisma.watch.findUnique({ where: { id: watch.id } });
    expect(finalWatch?.gainNotified).toBe(true);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.currentPrice).toBe(120);

    errorSpy.mockRestore();
  });

  it("processes multiple watches across shared and distinct tickers in a single poll", async () => {
    await createUser("u1");
    await createUser("u2");

    const aapl = await prisma.stock.create({ data: { ticker: "AAPL" } });
    const msft = await prisma.stock.create({ data: { ticker: "MSFT" } });

    const w1 = await prisma.watch.create({
      data: {
        userId: "u1",
        stockId: aapl.id,
        purchasePrice: 100,
        gainPct: 10,
        lossPct: -10,
      },
    });
    const w2 = await prisma.watch.create({
      data: {
        userId: "u2",
        stockId: aapl.id,
        purchasePrice: 100,
        gainPct: 50,
        lossPct: -15,
      },
    });
    const w3 = await prisma.watch.create({
      data: {
        userId: "u2",
        stockId: msft.id,
        purchasePrice: 200,
        gainPct: 10,
        lossPct: -10,
      },
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onAlert = vi.fn();
    const fetchMock = vi.fn().mockImplementation(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("symbol=AAPL")) {
        return { ok: true, json: async () => ({ c: 120 }) };
      }
      if (url.includes("symbol=MSFT")) {
        return { ok: true, json: async () => ({ c: 170 }) };
      }
      return { ok: false, status: 400, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    await runPricePoll(onAlert);

    expect(errorSpy).not.toHaveBeenCalled();

    const updatedW1 = await prisma.watch.findUnique({ where: { id: w1.id } });
    const updatedW2 = await prisma.watch.findUnique({ where: { id: w2.id } });
    const updatedW3 = await prisma.watch.findUnique({ where: { id: w3.id } });

    expect(updatedW1?.gainNotified).toBe(true);
    expect(updatedW2?.gainNotified).toBe(false);
    expect(updatedW3?.lossNotified).toBe(true);
    expect(onAlert).toHaveBeenCalledTimes(2);
    expect(onAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "gain", watchId: w1.id, ticker: "AAPL" }),
    );
    expect(onAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "loss", watchId: w3.id, ticker: "MSFT" }),
    );

    errorSpy.mockRestore();
  });
});