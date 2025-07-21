import request from "supertest";
import app from "../app.js";
import { describe, it, expect } from "vitest";

describe("POST /api/evaluate", () => {
  describe("Basic Formulas", () => {
    it("should evaluate a simple addition formula", async () => {
      const requestBody = {
        columns: {
          A: { title: "Column A" },
          B: { title: "Column B" },
          C: { title: "Column C" },
        },
        rows: 1,
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
      expect(response.body.table.data.C1.value).toBe("30");
    });

    it("should evaluate a simple subtraction formula", async () => {
      const requestBody = {
        columns: {
          A: { title: "Column A" },
          B: { title: "Column B" },
          C: { title: "Column C" },
        },
        rows: 1,
        data: {
          A1: { value: "20" },
          B1: { value: "5" },
          C1: { formula: "=A1-B1" },
        },
      };
      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);
      expect(response.status).toBe(200);
      expect(response.body.table.data.C1.value).toBe("15");
    });

    it("should evaluate a simple multiplication formula", async () => {
      const requestBody = {
        columns: {
          A: { title: "Column A" },
          B: { title: "Column B" },
          C: { title: "Column C" },
        },
        rows: 1,
        data: {
          A1: { value: "10" },
          B1: { value: "5" },
          C1: { formula: "=A1*B1" },
        },
      };
      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);
      expect(response.status).toBe(200);
      expect(response.body.table.data.C1.value).toBe("50");
    });

    it("should evaluate a formula with only literal values", async () => {
      const requestBody = {
        columns: { A: { title: "Column A" } },
        rows: 1,
        data: { A1: { formula: "=100/4" } },
      };
      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);
      expect(response.status).toBe(200);
      expect(response.body.table.data.A1.value).toBe("25");
    });
  });

  describe("Complex Formulas", () => {
    it("should handle a complex, nested formula with multiple operators", async () => {
      const requestBody = {
        columns: {
          A: { title: "Column A" },
          B: { title: "Column B" },
          C: { title: "Column C" },
          D: { title: "Column D" },
          E: { title: "Column E" },
        },
        rows: 1,
        data: {
          A1: { value: "5" },
          B1: { value: "10" },
          C1: { value: "50" },
          D1: { value: "2" },
          E1: { formula: "=((A1*B1)+(C1/2))^D1-100" },
        },
      };
      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);
      expect(response.status).toBe(200);
      // JS operator for exponent is **, grammar uses ^
      // ((5*10)+(50/2))^2-100 -> (50+25)^2-100 -> 75^2-100 = 5625-100 = 5525
      expect(response.body.table.data.E1.value).toBe("5525");
    });
  });

  describe("Chained Formulas", () => {
    it("should evaluate formulas that depend on other formulas", async () => {
      const requestBody = {
        columns: {
          A: { title: "Column A" },
          B: { title: "Column B" },
          C: { title: "Column C" },
        },
        rows: 1,
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

  describe("Error Handling and Edge Cases", () => {
    it("should detect and report circular references", async () => {
      const requestBody = {
        columns: { A: { title: "Column A" }, B: { title: "Column B" } },
        rows: 1,
        data: { A1: { formula: "=B1" }, B1: { formula: "=A1" } },
      };
      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);
      expect(response.status).toBe(200);
      expect(response.body.table.data.B1.error).toBe("#REF!");
    });

    it("should return #DIV/0! for division by zero", async () => {
      const requestBody = {
        columns: {
          A: { title: "Column A" },
          B: { title: "Column B" },
          C: { title: "Column C" },
        },
        rows: 1,
        data: {
          A1: { value: "10" },
          B1: { value: "0" },
          C1: { formula: "=A1/B1" },
        },
      };
      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);
      expect(response.status).toBe(200);
      expect(response.body.table.data.C1.error).toBe("#DIV/0!");
    });

    it("should return #VALUE! for operations on non-numeric text", async () => {
      const requestBody = {
        columns: { A: { title: "Column A" }, B: { title: "Column B" } },
        rows: 1,
        data: { A1: { value: '"hello"' }, B1: { formula: "=A1*10" } },
      };
      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);
      expect(response.status).toBe(200);
      expect(response.body.table.data.B1.error).toBe("#VALUE!");
    });

    it("should return #REF! when referencing a cell that does not exist", async () => {
      const requestBody = {
        columns: { A: { title: "Column A" } },
        rows: 1,
        data: { A1: { formula: "=Z99" } },
      };
      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);
      expect(response.status).toBe(200);
      expect(response.body.table.data.A1.error).toBe("#REF!");
    });

    it("should treat references to empty cells as 0", async () => {
      const requestBody = {
        columns: { A: { title: "Column A" }, B: { title: "Column B" } },
        rows: 1,
        data: { A1: { formula: "=B1+5" }, B1: { value: undefined } },
      };
      const response = await request(app)
        .post("/api/evaluate")
        .send(requestBody);
      expect(response.status).toBe(200);
      expect(response.body.table.data.A1.value).toBe("5");
    });
  });

  describe("Malformed Requests", () => {
    it("should return 400 for an empty request body", async () => {
      const response = await request(app).post("/api/evaluate").send({});
      expect(response.status).toBe(400);
    });

    it("should return 400 if the 'data' property is missing", async () => {
      const response = await request(app)
        .post("/api/evaluate")
        .send({ rows: 1, columns: {} });
      expect(response.status).toBe(400);
    });

    it("should return 400 if 'data' is not an object", async () => {
      const response = await request(app)
        .post("/api/evaluate")
        .send({ data: [] });
      expect(response.status).toBe(400);
    });
  });
});
