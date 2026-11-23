// Background stock price poller for Express + Prisma + PostgreSQL.
// Queries stocks with active watches, fetches live quotes from Finnhub
// using FINNHUB_API_KEY, updates Stock.currentPrice and priceUpdatedAt,
// inserts PriceSnapshot records, and triggers one-time gain/loss alert
// callbacks when percent change from purchasePrice crosses watch thresholds.



import { prisma } from "./db";
import { appendPriceSnapshotsToSpaces } from "./storage/priceHistory";
import { getSpacesConfig } from "./storage/spaces";

let isPolling = false;

export type AlertEvent = {
  type: "gain" | "loss";
  watchId: number;
  userId: string;
  userEmail?: string | null;
  ticker: string;
  currentPrice: number;
  purchasePrice: number;
  changePct: number;
};

type PollerOptions = {
  intervalMs?: number;
  onAlert?: (event: AlertEvent) => Promise<void> | void;
};

export async function runPricePoll(onAlert?: PollerOptions["onAlert"]) {
  if (isPolling) return;
  isPolling = true;

  try {
    const apiKey = process.env["FINNHUB_API_KEY"];
    if (!apiKey) {
      console.error("Missing FINNHUB_API_KEY; skipping price poll");
      return;
    }

    const stocks = await prisma.stock.findMany({
      where: { watches: { some: {} } },
      include: {
        watches: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    const spacesConfig = getSpacesConfig();

    const now = new Date();

    for (const stock of stocks) {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(stock.ticker)}&token=${encodeURIComponent(apiKey)}`
      );

      if (!response.ok) continue;

      const data = (await response.json()) as { c?: number };
      const currentPrice = data.c;

      if (typeof currentPrice !== "number" || currentPrice <= 0) continue;

      await prisma.$transaction([
        prisma.stock.update({
          where: { id: stock.id },
          data: { currentPrice, priceUpdatedAt: now },
        }),
        prisma.priceSnapshot.create({
          data: { stockId: stock.id, price: currentPrice, timestamp: now },
        }),
      ]);

      if (spacesConfig) {
        const results = await Promise.allSettled(
          stock.watches.map((watch) =>
            appendPriceSnapshotsToSpaces(
              watch.userId,
              watch.id,
              [{ timestamp: now, price: currentPrice }],
              undefined,
              spacesConfig,
            ),
          ),
        );
        for (const result of results) {
          if (result.status === "rejected") {
            console.error("Failed to append price snapshot to Spaces:", result.reason);
          }
        }
      }

      for (const watch of stock.watches) {
        if (watch.purchasePrice <= 0) continue;

        const changePct =
          ((currentPrice - watch.purchasePrice) / watch.purchasePrice) * 100;

        if (changePct >= watch.gainPct && !watch.gainNotified) {
          await prisma.watch.update({
            where: { id: watch.id },
            data: { gainNotified: true },
          });
          await onAlert?.({
            type: "gain",
            watchId: watch.id,
            userId: watch.userId,
            userEmail: watch.user?.email,
            ticker: stock.ticker,
            currentPrice,
            purchasePrice: watch.purchasePrice,
            changePct,
          });
        }

        if (changePct <= watch.lossPct && !watch.lossNotified) {
          await prisma.watch.update({
            where: { id: watch.id },
            data: { lossNotified: true },
          });
          await onAlert?.({
            type: "loss",
            watchId: watch.id,
            userId: watch.userId,
            userEmail: watch.user?.email,
            ticker: stock.ticker,
            currentPrice,
            purchasePrice: watch.purchasePrice,
            changePct,
          });
        }
      }
    }
  } catch (error) {
    console.error("Price poll failed:", error);
  } finally {
    isPolling = false;
  }
}

export function startPricePoller(options: PollerOptions = {}) {
  const intervalMs = options.intervalMs ?? 60_000;
  void runPricePoll(options.onAlert);
  const timer = setInterval(() => {
    void runPricePoll(options.onAlert);
  }, intervalMs);
  return () => clearInterval(timer);
}