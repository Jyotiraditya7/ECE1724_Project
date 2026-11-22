import express from "express";
import swaggerUi from "swagger-ui-express";
import { requireUser, type ResolveUserId } from "./auth";
import { errorHandler, notFoundHandler } from "./errors";
import { buildOpenApiDocument } from "./openapi";
import { watchesRouter } from "./watches/routes";
import { createNotificationRoutes } from "./notifications/routes";

export interface AppOptions {
  resolveUserId: ResolveUserId;
}

/**
 * Builds the Express app without starting a server, so tests can call it
 * directly and swap in their own way of identifying the user.
 */
export function createApp(options: AppOptions) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/watches", requireUser(options.resolveUserId), watchesRouter);
  app.use(
    "/api/alerts",
    requireUser(options.resolveUserId),
    createNotificationRoutes(options.resolveUserId)
  );

  const openApiDocument = buildOpenApiDocument();
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use("/api", notFoundHandler);
  app.use(errorHandler);
  return app;
  
}
