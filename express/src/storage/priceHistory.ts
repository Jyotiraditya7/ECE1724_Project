

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

