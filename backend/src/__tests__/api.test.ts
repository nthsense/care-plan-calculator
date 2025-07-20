import request from "supertest";
import app from "../app.js";
import { describe, it, expect } from "vitest";

describe("POST /api/evaluate", () => {
  it("should evaluate a simple formula and return the correct result", async () => {
    const requestBody = {
      rows: 1,
      columns: {
        A: { title: "Column A" },
        B: { title: "Column B" },
        C: { title: "Column C" },
      },
      data: {
        A1: { value: "10" },
        B1: { value: "20" },
        C1: { value: "###", formula: "=A1+B1" },
      },
    };

    const response = await request(app)
      .post("/api/evaluate")
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Evaluation received");
    expect(response.body.table.data.A1.value).toBe("10");
    expect(response.body.table.data.B1.value).toBe("20");
    expect(response.body.table.data.C1.value).toBe("30");
  });
});
