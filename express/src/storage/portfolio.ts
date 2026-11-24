import type { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import { createWatchSchema } from "../watches/schemas";
import {
  downloadTextObject,
  getPortfolioObjectKey,
  uploadTextObject,
  type SpacesConfig,
} from "./spaces";


export const sharedWatchItemSchema = createWatchSchema;

export const portfolioExportSchema = z.object({
  version: z.literal(1).default(1),
  exportedAt: z.string().optional(),
  watches: z.array(sharedWatchItemSchema),
});

export type SharedWatchItem = z.infer<typeof sharedWatchItemSchema>;
export type PortfolioExportData = z.infer<typeof portfolioExportSchema>;

export interface WatchRecordForExport {
  purchasePrice: number;
  gainPct: number;
  lossPct: number;
  stock: {
    ticker: string;
  };
}


export function buildPortfolioExportPayload(watches: WatchRecordForExport[]): PortfolioExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    watches: watches.map((watch) => ({
      ticker: watch.stock.ticker.trim().toUpperCase(),
      purchasePrice: watch.purchasePrice,
      gainPct: watch.gainPct,
      lossPct: watch.lossPct,
    })),
  };
}

export function serializePortfolioJson(watches: WatchRecordForExport[]): string {
  return JSON.stringify(buildPortfolioExportPayload(watches), null, 2);
}

export function parsePortfolioJson(rawJson: string): PortfolioExportData {
  const parsed = JSON.parse(rawJson) as unknown;
  return portfolioExportSchema.parse(parsed);
}

export async function savePortfolioToSpaces(
  userId: string,
  watches: WatchRecordForExport[],
  client?: S3Client,
  config?: SpacesConfig | null,
): Promise<string | null> {
  const key = getPortfolioObjectKey(userId);
  const body = serializePortfolioJson(watches);
  try{
    await uploadTextObject(key, body, "application/json; charset=utf-8", client, config);
    return key;
  } catch (error) {
    console.error("Failed to save portfolio to Spaces:", error);
    return null;
  }
  
}

export async function loadPortfolioFromSpaces(
  userId: string,
  client?: S3Client,
  config?: SpacesConfig | null,
): Promise<PortfolioExportData | null> {
  const key = getPortfolioObjectKey(userId);
  const raw = await downloadTextObject(key, client, config);
  if (raw === null) {
    return null;
  }
  return parsePortfolioJson(raw);
}