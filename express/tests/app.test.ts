import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./helpers";

describe("app", () => {
  it("reports health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("returns a JSON 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("returns a JSON 400 for malformed JSON bodies", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("content-type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Malformed JSON body" });
  });
});
