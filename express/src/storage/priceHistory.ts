import type { S3Client } from "@aws-sdk/client-s3";
import {
  deleteObject,
  downloadTextObject,
  getPriceHistoryCsvKey,
  uploadTextObject,
  type SpacesConfig,
} from "./spaces";

export interface PriceSnapshotRecord {
  timestamp: Date | string;
  price: number;
}

const CSV_HEADER = "timestamp,price";



function formatTimestamp(timestamp: Date | string): string {
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? String(timestamp) : parsed.toISOString();
}

export function formatPriceSnapshotRow(snapshot: PriceSnapshotRecord): string {
  if (!Number.isFinite(snapshot.price)) {
    throw new Error("Invalid snapshot price");
  }
  return `${formatTimestamp(snapshot.timestamp)},${snapshot.price}`;
}

export function serializePriceHistoryCsv(snapshots: PriceSnapshotRecord[]): string {
  const rows = snapshots.map((snapshot) => formatPriceSnapshotRow(snapshot));
  return `${CSV_HEADER}\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`;
}

export async function uploadFullPriceHistoryCsv(
  userId: string,
  watchId: number | string,
  snapshots: PriceSnapshotRecord[],
  client?: S3Client,
  config?: SpacesConfig | null,
): Promise<string> {
  const key = getPriceHistoryCsvKey(userId, watchId);
  const csv = serializePriceHistoryCsv(snapshots);
  await uploadTextObject(key, csv, "text/csv; charset=utf-8", client, config);
  return key;
}

export async function appendPriceSnapshotsToSpaces(
  userId: string,
  watchId: number | string,
  newSnapshots: PriceSnapshotRecord[],
  client?: S3Client,
  config?: SpacesConfig | null,
): Promise<string> {
  const key = getPriceHistoryCsvKey(userId, watchId);
  if (newSnapshots.length === 0) {
    return key;
  }

  const existingCsv = await downloadTextObject(key, client, config);
  const appendedRows = newSnapshots.map((snapshot) => formatPriceSnapshotRow(snapshot)).join("\n");


  const nextCsv =
    existingCsv && existingCsv.trim().length > 0
      ? `${existingCsv.replace(/\r?\n$/, "")}\n${appendedRows}\n`
      : `${CSV_HEADER}\n${appendedRows}\n`;

  await uploadTextObject(key, nextCsv, "text/csv; charset=utf-8", client, config);
  return key;
}

export async function downloadPriceHistoryCsv(
  userId: string,
  watchId: number | string,
  client?: S3Client,
  config?: SpacesConfig | null,
): Promise<string | null> {
  const key = getPriceHistoryCsvKey(userId, watchId);
  return downloadTextObject(key, client, config);
}

export async function deletePriceHistoryCsv(
  userId: string,
  watchId: number | string,
  client?: S3Client,
  config?: SpacesConfig | null,
): Promise<void> {
  const key = getPriceHistoryCsvKey(userId, watchId);
  await deleteObject(key, client, config);
}