import { Router } from "express";
import { prisma } from "../db";
import { createWatchSchema } from "./schemas";
import { toWatchResponse } from "./serialize";

/** Routes under /api/watches. Each one only touches the signed-in user's watches. */
export const watchesRouter = Router();

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
  res.status(201).json(toWatchResponse(watch));
});
