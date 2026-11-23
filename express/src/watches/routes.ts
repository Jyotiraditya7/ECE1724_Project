import { Router, type Request } from "express";
import { prisma } from "../db";
import { HttpError } from "../errors";
import { createWatchSchema, updateWatchSchema, watchIdSchema } from "./schemas";
import { toWatchResponse } from "./serialize";

/** Routes under /api/watches. Each one only touches the signed-in user's watches. */
export const watchesRouter = Router();

/**
 * Loads the watch named by `:id` if it belongs to the caller. Another user's
 * watch gets the same 404 as a missing one, so ids don't leak.
 */
async function findOwnWatch(req: Request) {
  const id = watchIdSchema.parse(req.params["id"]);
  const watch = await prisma.watch.findFirst({
    where: { id, userId: req.userId },
    include: { stock: true },
  });
  if (!watch) throw new HttpError(404, "Watch not found");
  return watch;
}

watchesRouter.get("/", async (req, res) => {
  const watches = await prisma.watch.findMany({
    where: { userId: req.userId },
    include: { stock: true },
    orderBy: [{ stock: { ticker: "asc" } }, { id: "asc" }],
  });
  res.json(watches.map(toWatchResponse));
});

watchesRouter.post("/", async (req, res) => {
  const { ticker, ...fields } = createWatchSchema.parse(req.body);
  const normalizedTicker = ticker.trim().toUpperCase();
  const apiKey = process.env["FINNHUB_API_KEY"];

  if (apiKey) {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(normalizedTicker)}&token=${encodeURIComponent(apiKey)}`
    );

    if (!response.ok) {
      throw new HttpError(502, "Failed to verify ticker with Finnhub");
    }

    const data = (await response.json()) as { c?: number; pc?: number };

    if (!data || ((data.c ?? 0) === 0 && (data.pc ?? 0) === 0)) {
      throw new HttpError(400, `Unknown ticker: ${normalizedTicker}`);
    }
  }

  const watch = await prisma.watch.create({
    data: {
      ...fields,
      user: { connect: { id: req.userId } },
      stock: {
        connectOrCreate: {
          where: { ticker: normalizedTicker },
          create: { ticker: normalizedTicker },
        },
      },
    },
    include: { stock: true },
  });

  res.status(201).json(toWatchResponse(watch));
});

watchesRouter.get("/:id", async (req, res) => {
  res.json(toWatchResponse(await findOwnWatch(req)));
});

/** The watch's stock prices since the watch was created, oldest first. */
function findPriceHistory(watch: { stockId: number; createdAt: Date }) {
  return prisma.priceSnapshot.findMany({
    where: { stockId: watch.stockId, timestamp: { gte: watch.createdAt } },
    orderBy: { timestamp: "asc" },
    select: { price: true, timestamp: true },
  });
}

/** Price history for the watch's graph. */
watchesRouter.get("/:id/prices", async (req, res) => {
  res.json(await findPriceHistory(await findOwnWatch(req)));
});

/** The same price history as a CSV file download, built from the database on request. */
watchesRouter.get("/:id/prices.csv", async (req, res) => {
  const watch = await findOwnWatch(req);
  const prices = await findPriceHistory(watch);
  const rows = prices.map((p) => `${p.timestamp.toISOString()},${p.price}\n`);
  res.attachment(`${watch.stock.ticker}-prices.csv`);
  res.send("timestamp,price\n" + rows.join(""));
});

watchesRouter.patch("/:id", async (req, res) => {
  const existing = await findOwnWatch(req);
  const changes = updateWatchSchema.parse(req.body);

  const watch = await prisma.watch.update({
    where: { id: existing.id },
    // New thresholds mean a fresh plan, so both alerts may fire again.
    data: { ...changes, gainNotified: false, lossNotified: false },
    include: { stock: true },
  });
  res.json(toWatchResponse(watch));
});

watchesRouter.delete("/:id", async (req, res) => {
  const watch = await findOwnWatch(req);
  await prisma.watch.delete({ where: { id: watch.id } });
  res.status(204).end();
});
