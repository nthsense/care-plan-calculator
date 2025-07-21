import express from "express";
import cors from "cors";
import { TableData } from "./types/TableData.js";
import { fromGraph, toGraph } from "./graph.js";
import evaluateGraph from "./evaluator.js";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/evaluate", (req, res) => {
  if (
    !req.body ||
    !req.body.data ||
    typeof req.body.data !== "object" ||
    Array.isArray(req.body.data)
  ) {
    return res.status(400).json({
      message: "Malformed request: 'data' property is missing or invalid.",
    });
  }

  const table: TableData = req.body;
  const graph = toGraph(table.data, table.columns, table.rows);
  evaluateGraph(graph);
  const result = fromGraph(graph, table);

  res.json({ message: "Evaluation received", table: result });
});

export default app;
