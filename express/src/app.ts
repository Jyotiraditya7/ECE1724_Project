import express, { type Request } from "express";
import { errorHandler, notFoundHandler } from "./errors";

/** Finds the signed-in user's id for a request, or null if nobody is signed in. */
export type ResolveUserId = (req: Request) => Promise<string | null>;

export interface AppOptions {
  resolveUserId: ResolveUserId;
}

/**
 * Builds the Express app without starting a server, so tests can call it
 * directly and swap in their own way of identifying the user.
 */
export function createApp(_options: AppOptions) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", notFoundHandler);
  app.use(errorHandler);
  return app;
}
