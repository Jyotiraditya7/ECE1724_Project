import { Router } from "express";
import { handleAlertStream } from "./sse";

/** Routes under /api/alerts. app.ts puts requireUser in front, so req.userId is set. */
export const notificationsRouter = Router();

/** Server-sent events stream of the signed-in user's threshold alerts. */
notificationsRouter.get("/stream", (req, res) => {
  handleAlertStream(req, res, req.userId);
});
