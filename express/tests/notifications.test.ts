import type { AddressInfo } from "node:net";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import nodemailer from "nodemailer";
import { app } from "./helpers";
import {
  handleAlertStream,
  broadcastAlertSse,
  type ThresholdAlertPayload,
} from "../src/notifications/sse";
import { sendThresholdAlertEmail } from "../src/notifications/email";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

type MockRes = {
  headers: Record<string, string>;
  flushed: boolean;
  chunks: string[];
  setHeader: ReturnType<typeof vi.fn>;
  flushHeaders: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
};

function createMockSseRes(throwOnAlertAfter?: number): MockRes {
  const res: MockRes = {
    headers: {},
    flushed: false,
    chunks: [],
    setHeader: vi.fn((key: string, value: string) => {
      res.headers[key] = value;
    }),
    flushHeaders: vi.fn(() => {
      res.flushed = true;
    }),
    write: vi.fn((chunk: string) => {
      res.chunks.push(chunk);
      if (
        throwOnAlertAfter !== undefined &&
        chunk.startsWith("event: alert\n") &&
        res.chunks.filter((c) => c.startsWith("event: alert\n")).length >=
          throwOnAlertAfter
      ) {
        throw new Error("Socket closed mid-write");
      }
      return true;
    }),
  };
  return res;
}

function createMockSseReq() {
  const handlers: Record<string, Array<() => void>> = {};
  return {
    on: vi.fn((event: string, cb: () => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
    }),
    emitClose: () => {
      for (const cb of handlers["close"] ?? []) {
        cb();
      }
    },
  };
}

const samplePayload: ThresholdAlertPayload = {
  type: "gain",
  watchId: 10,
  userId: "user-a",
  ticker: "GOOGL",
  currentPrice: 265.29,
  purchasePrice: 1,
  changePct: 26429,
};

describe("SSE Stream Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects unauthenticated requests to /api/alerts/stream with 401", async () => {
    const res = await request(app).get("/api/alerts/stream");
    expect(res.status).toBe(401);
  });

  it("cleans up heartbeat and client on disconnect, survives later broadcasts, and supports reconnect", () => {
    const req1 = createMockSseReq();
    const res1 = createMockSseRes();

    handleAlertStream(req1 as never, res1 as never, "user-a");

    expect(res1.headers["Content-Type"]).toBe("text/event-stream");
    expect(res1.chunks[0]).toContain("event: connected");

    vi.advanceTimersByTime(25_000);
    expect(res1.chunks).toContain(": ping\n\n");

    req1.emitClose();
    const chunksAfterClose = res1.chunks.length;

    vi.advanceTimersByTime(50_000);
    expect(res1.chunks.length).toBe(chunksAfterClose);

    expect(() => broadcastAlertSse(samplePayload)).not.toThrow();
    expect(res1.chunks.length).toBe(chunksAfterClose);

    const req2 = createMockSseReq();
    const res2 = createMockSseRes();
    handleAlertStream(req2 as never, res2 as never, "user-a");

    broadcastAlertSse({ ...samplePayload, watchId: 11, ticker: "AAPL" });
    expect(res2.chunks.some((c) => c.includes('"ticker":"AAPL"'))).toBe(true);

    req2.emitClose();
  });

  it("delivers alerts to multiple concurrent clients and keeps active client working after one disconnects", () => {
    const req1 = createMockSseReq();
    const res1 = createMockSseRes();
    const req2 = createMockSseReq();
    const res2 = createMockSseRes();

    handleAlertStream(req1 as never, res1 as never, "user-a");
    handleAlertStream(req2 as never, res2 as never, "user-a");

    broadcastAlertSse(samplePayload);

    expect(res1.chunks.some((c) => c.includes('"watchId":10'))).toBe(true);
    expect(res2.chunks.some((c) => c.includes('"watchId":10'))).toBe(true);

    req1.emitClose();
    const res1Count = res1.chunks.length;

    broadcastAlertSse({ ...samplePayload, watchId: 12, ticker: "MSFT" });

    expect(res1.chunks.length).toBe(res1Count);
    expect(res2.chunks.some((c) => c.includes('"ticker":"MSFT"'))).toBe(true);

    req2.emitClose();
  });

  it("removes client when writing an alert throws", () => {
    const req = createMockSseReq();
    const res = createMockSseRes(1);

    handleAlertStream(req as never, res as never, "user-a");

    expect(() => broadcastAlertSse(samplePayload)).not.toThrow();
    const countAfterError = res.chunks.length;

    broadcastAlertSse({ ...samplePayload, watchId: 13 });
    expect(res.chunks.length).toBe(countAfterError);

    req.emitClose();
  });

  it("delivers alerts only to the matching userId and not to other users or demo-user", () => {
    const reqA = createMockSseReq();
    const resA = createMockSseRes();
    const reqB = createMockSseReq();
    const resB = createMockSseRes();
    const reqDemo = createMockSseReq();
    const resDemo = createMockSseRes();

    handleAlertStream(reqA as never, resA as never, "user-a");
    handleAlertStream(reqB as never, resB as never, "user-b");
    handleAlertStream(reqDemo as never, resDemo as never, "demo-user");

    broadcastAlertSse({ ...samplePayload, userId: "user-b", watchId: 20, ticker: "NVDA" });

    expect(resB.chunks.some((c) => c.includes('"ticker":"NVDA"'))).toBe(true);
    expect(resA.chunks.some((c) => c.includes('"ticker":"NVDA"'))).toBe(false);
    expect(resDemo.chunks.some((c) => c.includes('"ticker":"NVDA"'))).toBe(false);

    reqA.emitClose();
    reqB.emitClose();
    reqDemo.emitClose();
  });
});

describe("GET /api/alerts/stream", () => {
  it("rejects a signed-out request with the usual 401 body", async () => {
    const res = await request(app).get("/api/alerts/stream");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not signed in" });
  });

  it("opens an event stream for the signed-in user", async () => {
    // The stream never ends, so read its first event over a real socket and hang up.
    const server = app.listen(0);
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/api/alerts/stream`, {
        headers: { "x-test-user": "alice" },
      });
      const reader = res.body!.getReader();
      const first = new TextDecoder().decode((await reader.read()).value);
      await reader.cancel();

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/event-stream");
      expect(first).toMatch(/^event: connected\ndata: \{"userId":"alice",/);
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
});

describe("Email Notification Edge Cases", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...envSnapshot };
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("skips cleanly when SMTP env vars or recipient are missing", async () => {
    delete process.env["SMTP_HOST"];
    delete process.env["SMTP_PORT"];
    delete process.env["SMTP_USER"];
    delete process.env["SMTP_PASS"];
    delete process.env["ALERT_EMAIL_TO"];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      sendThresholdAlertEmail({ ...samplePayload, userId: "user-id-without-at" }),
    ).resolves.toBeUndefined();

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("rejects when transport.sendMail fails so Promise.allSettled isolates the error", async () => {
    process.env["SMTP_HOST"] = "smtp.gmail.com";
    process.env["SMTP_PORT"] = "587";
    process.env["SMTP_USER"] = "sender@example.com";
    process.env["SMTP_PASS"] = "app-password";

    const payloadWithEmail = {
      ...samplePayload,
      userEmail: "recipient@example.com",
    };

    const sendMail = vi.fn().mockRejectedValue(new Error("535 5.7.8 Auth failed"));
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);

    const sseCalled = vi.fn();
    const settled = await Promise.allSettled([
      Promise.resolve().then(() => sseCalled(payloadWithEmail)),
      sendThresholdAlertEmail(payloadWithEmail),
    ]);

    expect(sseCalled).toHaveBeenCalledWith(payloadWithEmail);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "recipient@example.com" }),
    );
    expect(settled[0]?.status).toBe("fulfilled");
    expect(settled[1]?.status).toBe("rejected");
  });

  it("sets tls.rejectUnauthorized to false only when SMTP_ALLOW_INVALID_CERT is true", async () => {
    process.env["SMTP_HOST"] = "smtp.gmail.com";
    process.env["SMTP_PORT"] = "587";
    process.env["SMTP_USER"] = "sender@example.com";
    process.env["SMTP_PASS"] = "app-password";
    process.env["ALERT_EMAIL_TO"] = "recipient@example.com";

    const sendMail = vi.fn().mockResolvedValue({ messageId: "ok" });
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);

    delete process.env["SMTP_ALLOW_INVALID_CERT"];
    await sendThresholdAlertEmail(samplePayload);
    const defaultOpts = vi.mocked(nodemailer.createTransport).mock.calls.at(-1)?.[0] as
      | { tls?: { rejectUnauthorized?: boolean } }
      | undefined;
    expect(defaultOpts?.tls).toBeUndefined();

    process.env["SMTP_ALLOW_INVALID_CERT"] = "false";
    await sendThresholdAlertEmail(samplePayload);
    const falseOpts = vi.mocked(nodemailer.createTransport).mock.calls.at(-1)?.[0] as
      | { tls?: { rejectUnauthorized?: boolean } }
      | undefined;
    expect(falseOpts?.tls).toBeUndefined();

    process.env["SMTP_ALLOW_INVALID_CERT"] = "true";
    await sendThresholdAlertEmail(samplePayload);
    const trueOpts = vi.mocked(nodemailer.createTransport).mock.calls.at(-1)?.[0] as
      | { tls?: { rejectUnauthorized?: boolean } }
      | undefined;
    expect(trueOpts?.tls).toEqual({ rejectUnauthorized: false });
  });
  
  it("sends to event.userEmail instead of ALERT_EMAIL_TO when userEmail is missing", async () => {
    process.env["SMTP_HOST"] = "smtp.gmail.com";
    process.env["SMTP_PORT"] = "587";
    process.env["SMTP_USER"] = "sender@example.com";
    process.env["SMTP_PASS"] = "app-password";
    process.env["ALERT_EMAIL_TO"] = "static-fallback@example.com";

    const sendMail = vi.fn().mockResolvedValue({});
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);

    await sendThresholdAlertEmail({ ...samplePayload, userId: "alice", userEmail: "alice@example.com" });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "alice@example.com" }));

    sendMail.mockClear();
    await sendThresholdAlertEmail({ ...samplePayload, userId: "bob", userEmail: undefined });
    expect(sendMail).not.toHaveBeenCalled();
  });
});