import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./helpers";

describe("API documentation", () => {
  it("serves an OpenAPI document covering every watch endpoint", async () => {
    const res = await request(app).get("/api/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    const methods = (path: string) => Object.keys(res.body.paths[path] ?? {}).sort();
    expect(methods("/api/watches")).toEqual(["get", "post"]);
    expect(methods("/api/watches/{id}")).toEqual(["delete", "get", "patch"]);
    expect(methods("/api/watches/{id}/prices")).toEqual(["get"]);
  });

  it("documents request bodies from the same Zod schemas used for validation", async () => {
    const res = await request(app).get("/api/openapi.json");
    const body = res.body.components.schemas.CreateWatch;
    expect(body.required.sort()).toEqual(["gainPct", "lossPct", "purchasePrice", "ticker"]);
  });

  it("serves Swagger UI at /api/docs", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});
