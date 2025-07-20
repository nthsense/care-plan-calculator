import request from "supertest";
import app from "../app.js";
import { describe, it, expect } from "vitest";

describe("POST /api/evaluate", () => {
  describe("Basic Formulas", () => {
    it("should evaluate a simple addition formula", async () => {
      const requestBody = {
        data: {
          A1: { value: "10" },
          B1: { value: "20" },
          C1: { formula: "=A1+B1" },
        },
      };

      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);

      expect(response.status).toBe(200);
      const { data } = response.body.table;
      expect(data.C1.value).toBe("30");
    });

    it("should handle order of operations correctly (parentheses)", async () => {
      const requestBody = {
        data: {
          A1: { value: "10" },
          B1: { value: "5" },
          C1: { value: "2" },
          D1: { formula: "=(A1+B1)/C1" },
        },
      };

      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);

      expect(response.status).toBe(200);
      const { data } = response.body.table;
      expect(data.D1.value).toBe("7.5");
    });
  });

  describe("Chained Formulas", () => {
    it("should evaluate formulas that depend on other formulas", async () => {
      const requestBody = {
        data: {
          A1: { value: "10" },
          B1: { formula: "=A1*2" },
          C1: { formula: "=B1+5" },
        },
      };

      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);

      expect(response.status).toBe(200);
      const { data } = response.body.table;
      expect(data.B1.value).toBe("20");
      expect(data.C1.value).toBe("25");
    });
  });

  describe("Error Handling", () => {
    it("should detect and report circular references", async () => {
      const requestBody = {
        data: {
          A1: { formula: "=B1" },
          B1: { formula: "=A1" },
        },
      };

      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);

      expect(response.status).toBe(200);
      const { data } = response.body.table;
      // The current implementation only marks the node that *creates* the cycle.
      expect(data.A1.error).toBeUndefined();
      expect(data.B1.error).toBe("Cycle!!");
    });

    it("should handle syntactically invalid formulas", async () => {
      const requestBody = {
        data: {
          A1: { formula: "=1+&" },
        },
      };

      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);

      expect(response.status).toBe(200);
      const { data } = response.body.table;
      expect(data.A1.error).toContain("ERROR!");
      expect(data.A1.value).toBeUndefined();
    });

    it("should treat references to empty cells as 0", async () => {
      const requestBody = {
        data: {
          A1: { formula: "=B1+5" },
          B1: { value: undefined }, // B1 is empty
        },
      };

      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);

      expect(response.status).toBe(200);
      const { data } = response.body.table;
      // A good implementation should treat empty cells as 0.
      // The current implementation will likely fail this test, which is what we want.
      expect(data.A1.value).toBe("5");
    });
  });
});