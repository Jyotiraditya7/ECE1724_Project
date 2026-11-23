import nodemailer from "nodemailer";
import type { ThresholdAlertPayload } from "./sse";

function resolveRecipientEmail(event: ThresholdAlertPayload): string | undefined {
  const ownerEmail = event.userEmail?.trim();
  if (ownerEmail) {
    return ownerEmail;
  }
  if (event.userId.includes("@")) {
    return event.userId;
  }
  return undefined;
}

function createTransport() {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] ?? 587);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  const allowInvalidCert = process.env["SMTP_ALLOW_INVALID_CERT"] === "true";

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: allowInvalidCert ? { rejectUnauthorized: false } : undefined,
  });
}

export async function sendThresholdAlertEmail(
  event: ThresholdAlertPayload
): Promise<void> {
  const transporter = createTransport();
  const to = resolveRecipientEmail(event);

  if (!transporter || !to) {
    console.log("Email skipped (SMTP_HOST/SMTP_USER/SMTP_PASS or recipient email not available):", {
      ticker: event.ticker,
      type: event.type,
      changePct: event.changePct,
    });
    return;
  }

  const from = process.env["ALERT_EMAIL_FROM"] ?? process.env["SMTP_USER"]!;
  const directionLabel = event.type === "gain" ? "Gain Target Reached" : "Loss Threshold Hit";
  const formattedPct = `${event.changePct >= 0 ? "+" : ""}${event.changePct.toFixed(2)}%`;

  await transporter.sendMail({
    from,
    to,
    subject: `[${event.ticker}] ${directionLabel} (${formattedPct})`,
    text: [
      `Alert Type: ${event.type.toUpperCase()}`,
      `Ticker: ${event.ticker}`,
      `Current Price: $${event.currentPrice.toFixed(2)}`,
      `Purchase Price: $${event.purchasePrice.toFixed(2)}`,
      `Change: ${formattedPct}`,
      `Watch ID: ${event.watchId}`,
    ].join("\n"),
  });
}