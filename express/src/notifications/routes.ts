import { Router } from "express";
import type { ResolveUserId } from "../auth";
import { handleAlertStream } from "./sse";

export function createNotificationRoutes(resolveUserId: ResolveUserId): Router {
  const router = Router();

  router.get("/stream", async (req, res, next) => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      handleAlertStream(req, res, userId);
    } catch (err) {
      next(err);
    }
  });

  return router;
}