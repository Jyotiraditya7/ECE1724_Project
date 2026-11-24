import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPortfolioExportPayload,
  loadPortfolioFromSpaces,
  parsePortfolioJson,
  savePortfolioToSpaces,
  serializePortfolioJson,
} from "../src/storage/portfolio";
import {

  formatPriceSnapshotRow,
  serializePriceHistoryCsv,

} from "../src/storage/priceHistory";
import {
  createSpacesClient,
  deleteObject,
  downloadTextObject,
  getPortfolioObjectKey,

  getSpacesConfig,
  uploadTextObject,
  type SpacesConfig,
} from "../src/storage/spaces";

describe("DigitalOcean Spaces helpers", () => {
  const sampleConfig: SpacesConfig = {
    endpoint: "https://tor1.digitaloceanspaces.com",
    region: "tor1",
    bucket: "test-bucket",
    accessKeyId: "test-key",
    secretAccessKey: "test-secret",
  };

  beforeEach(() => {
    delete process.env["DO_SPACES_ENDPOINT"];
    delete process.env["DO_SPACES_REGION"];
    delete process.env["DO_SPACES_BUCKET"];
    delete process.env["DO_SPACES_ACCESS_KEY"];
    delete process.env["DO_SPACES_SECRET_KEY"];
  });

  it("returns null when required Spaces env vars are missing", () => {
    expect(getSpacesConfig()).toBeNull();
  });

  it("reads Spaces config with tor1 defaults", () => {
    process.env["DO_SPACES_ENDPOINT"] = "https://tor1.digitaloceanspaces.com";
    process.env["DO_SPACES_BUCKET"] = "my-watches";
    process.env["DO_SPACES_ACCESS_KEY"] = "key123";
    process.env["DO_SPACES_SECRET_KEY"] = "secret456";

    expect(getSpacesConfig()).toEqual({
      endpoint: "https://tor1.digitaloceanspaces.com",
      region: "tor1",
      bucket: "my-watches",
      accessKeyId: "key123",
      secretAccessKey: "secret456",
    });
  });

  it("builds sanitized object keys under users/{userId}", () => {
    expect(getPortfolioObjectKey("user_1")).toBe("users/user_1/portfolio.json");
    
  });

  it("creates an S3Client and uploads, downloads, and deletes text objects", async () => {
    const send = vi.fn();
    const mockClient = { send } as unknown as S3Client;
    const client = createSpacesClient(sampleConfig);
    expect(client).toBeDefined();

    await uploadTextObject("users/u1/portfolio.json", "{}", "application/json", mockClient, sampleConfig);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(PutObjectCommand);

    send.mockResolvedValueOnce({
      Body: {
        transformToString: vi.fn().mockResolvedValue('{"version":1}'),
      },
    });
    const downloaded = await downloadTextObject("users/u1/portfolio.json", mockClient, sampleConfig);
    expect(downloaded).toBe('{"version":1}');
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(GetObjectCommand);

    send.mockRejectedValueOnce({ name: "NoSuchKey", $metadata: { httpStatusCode: 404 } });
    const missing = await downloadTextObject("users/u1/missing.json", mockClient, sampleConfig);
    expect(missing).toBeNull();

    await deleteObject("users/u1/portfolio.json", mockClient, sampleConfig);
    expect(send.mock.calls[3]?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });
});

describe("Portfolio JSON export and import", () => {
  const sampleConfig: SpacesConfig = {
    endpoint: "https://tor1.digitaloceanspaces.com",
    region: "tor1",
    bucket: "test-bucket",
    accessKeyId: "test-key",
    secretAccessKey: "test-secret",
  };

  it("serializes and parses portfolio JSON", () => {
    const payload = buildPortfolioExportPayload([
      {
        purchasePrice: 150,
        gainPct: 10,
        lossPct: -5,
        stock: { ticker: "aapl" },
      },
    ]);
    expect(payload.version).toBe(1);
    expect(payload.watches).toEqual([
      { ticker: "AAPL", purchasePrice: 150, gainPct: 10, lossPct: -5 },
    ]);

    const json = serializePortfolioJson([
      {
        purchasePrice: 200,
        gainPct: 15,
        lossPct: -10,
        stock: { ticker: "msft" },
      },
    ]);
    const parsed = parsePortfolioJson(json);
    expect(parsed.watches[0]?.ticker).toBe("MSFT");
  });

  it("rejects invalid portfolio JSON on import parse", () => {
    expect(() =>
      parsePortfolioJson(
        JSON.stringify({
          version: 1,
          watches: [{ ticker: "AAPL", purchasePrice: -10, gainPct: 5, lossPct: -5 }],
        }),
      ),
    ).toThrow();
  });

  it("saves and loads portfolio JSON via Spaces", async () => {
    const send = vi.fn();
    const mockClient = { send } as unknown as S3Client;

    const key = await savePortfolioToSpaces(
      "user-9",
      [{ purchasePrice: 120, gainPct: 8, lossPct: -4, stock: { ticker: "NVDA" } }],
      mockClient,
      sampleConfig,
    );
    expect(key).toBe("users/user-9/portfolio.json");
    expect(send).toHaveBeenCalledTimes(1);

    send.mockResolvedValueOnce({
      Body: {
        transformToString: vi.fn().mockResolvedValue(
          JSON.stringify({
            version: 1,
            watches: [{ ticker: "NVDA", purchasePrice: 120, gainPct: 8, lossPct: -4 }],
          }),
        ),
      },
    });
    const loaded = await loadPortfolioFromSpaces("user-9", mockClient, sampleConfig);
    expect(loaded?.watches[0]?.ticker).toBe("NVDA");
  });
});

describe("Price history CSV formatting", () => {

  it("formats rows and serializes full CSVs", () => {
    const ts = new Date("2026-01-15T12:00:00.000Z");
    expect(formatPriceSnapshotRow({ timestamp: ts, price: 185.5 })).toBe(
      "2026-01-15T12:00:00.000Z,185.5",
    );

    const csv = serializePriceHistoryCsv([{ timestamp: ts, price: 185.5 }]);
    expect(csv).toBe("timestamp,price\n2026-01-15T12:00:00.000Z,185.5\n");
  });


});