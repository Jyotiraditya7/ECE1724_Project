import { Router, type Request } from "express";
import { ZodError } from "zod";
import { prisma } from "../db";
import { HttpError } from "../errors";
import {
  portfolioExportSchema,
  savePortfolioToSpaces,
  serializePortfolioJson,
} from "../storage/portfolio";
import {
  deletePriceHistoryCsv,
  downloadPriceHistoryCsv,
  serializePriceHistoryCsv,
  uploadFullPriceHistoryCsv,
} from "../storage/priceHistory";
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

async function syncUserPortfolioIfConfigured(userId: string) {
  const config = getSpacesConfig();
  if (!config) {
    return;
  }
  const watches = await listUserWatches(userId);
  await savePortfolioToSpaces(userId, watches, undefined, config);
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
  const watches = await listUserWatches(req.userId); //prisma call moved to async function listUserWatches line 23
  res.json(watches.map(toWatchResponse));
});

watchesRouter.get("/portfolio.json", async (req, res) => {
  const watches = await listUserWatches(req.userId);
  const json = serializePortfolioJson(watches);
  const config = getSpacesConfig();
  if (config) {
    await savePortfolioToSpaces(req.userId, watches, undefined, config);
  }
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

  let parsedPortfolio;
  try {
    parsedPortfolio = portfolioExportSchema.parse(rawPayload);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new HttpError(400, err.issues.map((i) => i.message).join("; "));
    }
    throw err;
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

  await syncUserPortfolioIfConfigured(req.userId);
  res.status(201).json(created.map(toWatchResponse));
});

watchesRouter.post("/", async (req, res) => {
  const { ticker, ...fields } = createWatchSchema.parse(req.body);
  // TODO(Finnhub): reject tickers Finnhub doesn't know (proposal validation rule).

  const watch = await prisma.watch.create({
    data: {
      ...fields,
      user: { connect: { id: req.userId } },
      // Reuse the shared Stock row if another watch already tracks this ticker.
      stock: { connectOrCreate: { where: { ticker }, create: { ticker } } },
    },
    include: { stock: true },
  });
  await syncUserPortfolioIfConfigured(req.userId);
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
  const config = getSpacesConfig();
  let csv: string | null = null;

  if (config) {
    csv = await downloadPriceHistoryCsv(req.userId, watch.id, undefined, config);
  }

  if (csv === null) {
    const prices = await findPriceHistory(watch);
    csv = serializePriceHistoryCsv(prices);
    if (config) {
      await uploadFullPriceHistoryCsv(req.userId, watch.id, prices, undefined, config);
    }
  }

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
  await syncUserPortfolioIfConfigured(req.userId);
  res.json(toWatchResponse(watch));
});

watchesRouter.delete("/:id", async (req, res) => {
  const watch = await findOwnWatch(req);
  await prisma.watch.delete({ where: { id: watch.id } });
  const config = getSpacesConfig();
  if (config) {
    await deletePriceHistoryCsv(req.userId, watch.id, undefined, config);
    await syncUserPortfolioIfConfigured(req.userId);
  }
  res.status(204).end();
});
