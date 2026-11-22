import type { Request, Response } from "express";

export interface ThresholdAlertPayload {
  type: "gain" | "loss";
  watchId: number;
  userId: string;
  ticker: string;
  currentPrice: number;
  purchasePrice: number;
  changePct: number;
}

interface SseClient {
  id: string;
  userId: string;
  res: Response;
  heartbeat: NodeJS.Timeout;
}

const clients = new Set<SseClient>();

function writeSseEvent(res: Response, eventName: string, data: unknown): void {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function handleAlertStream(
  req: Request,
  res: Response,
  userId: string
): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  writeSseEvent(res, "connected", { userId, connectedAt: new Date().toISOString() });

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 25_000);

  const client: SseClient = {
    id: clientId,
    userId,
    res,
    heartbeat,
  };

  clients.add(client);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
}

export function broadcastAlertSse(event: ThresholdAlertPayload): void {
  for (const client of clients) {
    if (client.userId === event.userId || client.userId === "demo-user") {
      try {
        writeSseEvent(client.res, "alert", event);
      } catch {
        clearInterval(client.heartbeat);
        clients.delete(client);
      }
    }
  }
}