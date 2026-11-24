import { Router, type Request } from "express";

import { prisma } from "../db";
import { HttpError } from "../errors";
import {
  portfolioExportSchema,
  savePortfolioToSpaces,
  serializePortfolioJson,
} from "../storage/portfolio";
import { serializePriceHistoryCsv } from "../storage/priceHistory";
import { getSpacesConfig } from "../storage/spaces";
import { createWatchSchema, updateWatchSchema, watchIdSchema } from "./schemas";
import { toWatchResponse } from "./serialize";

/** Routes under /api/watches. Each one only touches the signed-in user's watches. */
export const watchesRouter = Router();

async function listUserWatches(userId: string) {
  return prisma.watch.findMany({
    where: { userId },
    include: { stock: true },
    orderBy: [{ stock: { ticker: "asc" } }, { id: "asc" }],
  });
}

async function persistPortfolioToSpacesIfConfigured(
  userId: string,
  watches: Awaited<ReturnType<typeof listUserWatches>>,
) {
  const config = getSpacesConfig();
  if (!config) {
    return;
  }

  try {
    await savePortfolioToSpaces(userId, watches, undefined, config);
  } catch (error) {
    console.error("Failed to save portfolio to Spaces:", error);
  }
}

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
  const watches = await listUserWatches(req.userId);
  res.json(watches.map(toWatchResponse));
});

watchesRouter.get("/portfolio.json", async (req, res) => {
  const watches = await listUserWatches(req.userId);
  const json = serializePortfolioJson(watches);
  await persistPortfolioToSpacesIfConfigured(req.userId, watches);
  res.type("application/json");
  res.attachment("portfolio.json");
  res.send(json);
});

watchesRouter.post("/portfolio/import", async (req, res) => {
  let rawPayload: unknown = req.body;
  if (
    rawPayload &&
    typeof rawPayload === "object" &&
    "json" in rawPayload &&
    typeof (rawPayload as { json: unknown }).json === "string"
  ) {
    try {
      rawPayload = JSON.parse((rawPayload as { json: string }).json) as unknown;
    } catch {
      throw new HttpError(400, "Invalid portfolio JSON");
    }
  }

  const parsedPortfolio = portfolioExportSchema.parse(rawPayload);

  if (parsedPortfolio.watches.length === 0) {
    throw new HttpError(400, "Portfolio import must contain at least one watch");
  }

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const item of parsedPortfolio.watches) {
      const watch = await tx.watch.create({
        data: {
          purchasePrice: item.purchasePrice,
          gainPct: item.gainPct,
          lossPct: item.lossPct,
          user: { connect: { id: req.userId } },
          stock: {
            connectOrCreate: {
              where: { ticker: item.ticker },
              create: { ticker: item.ticker },
            },
          },
        },
        include: { stock: true },
      });
      results.push(watch);
    }
    return results;
  });

  const updatedWatches = await listUserWatches(req.userId);
  await persistPortfolioToSpacesIfConfigured(req.userId, updatedWatches);
  res.status(201).json(created.map(toWatchResponse));
});

watchesRouter.post("/", async (req, res) => {
  // The schema already trims and upper-cases the ticker.
  const { ticker, ...fields } = createWatchSchema.parse(req.body);
  const apiKey = process.env["FINNHUB_API_KEY"];

  if (apiKey) {
    const finnhubDown = new HttpError(502, "Failed to verify ticker with Finnhub");
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(apiKey)}`
    ).catch(() => {
      throw finnhubDown;
    });

    if (!response.ok) {
      throw finnhubDown;
    }

    const data = (await response.json()) as { c?: number; pc?: number };

    if (!data || ((data.c ?? 0) === 0 && (data.pc ?? 0) === 0)) {
      throw new HttpError(400, `Unknown ticker: ${ticker}`);
    }
  }

  const watch = await prisma.watch.create({
    data: {
      ...fields,
      user: { connect: { id: req.userId } },
      stock: {
        connectOrCreate: {
          where: { ticker },
          create: { ticker },
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
  const csv = serializePriceHistoryCsv(prices);


  res.type("text/csv");
  res.attachment(`${watch.stock.ticker}-prices.csv`);
  res.send(csv);
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
