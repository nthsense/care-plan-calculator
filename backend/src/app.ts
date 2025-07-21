import express from "express";
import cors from "cors";
import { Cell, Columns, Data, TableData } from "./types/TableData.js";
import { DirectedGraph } from "graphology";
import { parser } from "./parser/syntax.grammar.js";
import { SyntaxNode, SyntaxNodeRef, Tree } from "@lezer/common";
import { forEachNodeInTopologicalOrder, willCreateCycle } from "graphology-dag";

const app = express();

app.use(cors());
app.use(express.json());

interface GraphNodeAttrs {
  tree: Tree;
  cell: Cell;
}

function isValidCell(id: string, columns: Columns, rows: number) {
  const matches = id.match(/([a-zA-Z]+)([0-9]+)/)!;
  const colId = matches[1];
  const rowNum = parseInt(matches[2], 10);
  return columns[colId] != undefined && rowNum > 0 && rowNum <= rows;
}

function toGraph(tableData: Data, columns: Columns, rows: number) {
  const graph = new DirectedGraph();
  for (const key in tableData) {
    const cell: Cell = {
      value: tableData[key].value,
      formula: tableData[key].formula,
      error: undefined,
    };
    if (cell.formula) {
      const tree = parser.parse(cell.formula);
      if (graph.hasNode(key)) {
        graph.updateNode(key, (attrs) => ({ ...attrs, tree, cell }));
      } else {
        graph.addNode(key, { tree, cell });
      }
      tree.iterate({
        enter: (node: SyntaxNodeRef) => {
          // TODO: Implement handling for RangeToken (ex, spread A1:D1 to A1, B1, C1, D1)
          if (node.type.name === "CellToken") {
            const tokenText = cell.formula?.substring(node.from, node.to)!;
            if (willCreateCycle(graph, tokenText, key)) {
              cell.error = "#REF!";
              graph.updateNode(key, (attrs) => ({ ...attrs, cell }));
            } else if (isValidCell(tokenText, columns, rows)) {
              if (!graph.hasNode(tokenText)) {
                graph.addNode(tokenText, { cell: { value: undefined } });
              }
              graph.addDirectedEdge(tokenText, key);
            }
          }
          return true;
        },
      });
    } else {
      if (graph.hasNode(key)) {
        graph.updateNode(key, (attrs) => ({ ...attrs, cell }));
      } else {
        graph.addNode(key, { cell });
      }
    }
  }

  return graph;
}

class EvaluationError extends Error {
  constructor(message: string, cell: Cell) {
    super(message);
    this.name = "EvaluationError"; // Set the name to the class name
    this.cell = cell;
  }
  public cell: Cell;
}

function evaluateNode(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
): string {
  let results = "";

  // Depth first
  if (node.firstChild) {
    results += evaluateNode(node.firstChild, graph, cellReference);
  }

  // Ignore the leading equals sign on formulas.
  if (node.type.name == "Eqop" && node.parent?.type.name == "Program") {
    if (node.nextSibling) {
      results += evaluateNode(node.nextSibling, graph, cellReference);
    }
    return results;
  }

  switch (node.type.name) {
    case "NameToken":
      results += `"${(
        graph.getNodeAttributes(cellReference) as GraphNodeAttrs
      ).cell.formula?.substring(node.from, node.to)}"`;
      break;
    case "Eqop":
      // The equal sign is always used to compare inside a formula.
      results += "==";
      break;
    case "BoolToken":
    case "Number":
    case "Mulop":
    case "Plusop":
    case "Divop":
    case "Minop":
    case "Concatop":
    case "Percentop":
    case "Gtop":
    case "Ltop":
    case "Neqop":
    case "Gteop":
    case "Lteop":
    case "OpenParen":
    case "CloseParen":
      results += (
        graph.getNodeAttributes(cellReference) as GraphNodeAttrs
      ).cell.formula?.substring(node.from, node.to);
      break;
    case "Expop":
      results += "**";
      break;
    case "CellToken":
      const ref = (
        graph.getNodeAttributes(cellReference) as GraphNodeAttrs
      ).cell.formula?.substring(node.from, node.to);

      if (!graph.hasNode(ref)) {
        throw new EvaluationError("Ref error", {
          value: undefined,
          error: "#REF!",
        });
      }
      results +=
        (graph.getNodeAttributes(ref) as GraphNodeAttrs).cell.value || "0";
      break;
    case "FunctionCall":
      try {
        const func = new Function(`return ${results}`);
        results = func();
      } catch (e: unknown) {
        throw new EvaluationError((e as Error).message, {
          value: undefined,
          error: "#VALUE!",
        });
      }
      break;
    default:
      break;
  }

  // Then breadth
  if (node.nextSibling) {
    const nextResult = evaluateNode(node.nextSibling, graph, cellReference);
    if (node.type.name == "Divop" && nextResult === "0") {
      throw new EvaluationError("Divide by zero", {
        value: undefined,
        error: "#DIV/0!",
      });
    } else {
      results += evaluateNode(node.nextSibling, graph, cellReference);
    }
  }
  return results;
}

function evaluateGraph(graph: DirectedGraph) {
  forEachNodeInTopologicalOrder(graph, (node, attr) => {
    const { tree, cell } = attr as GraphNodeAttrs;
    if (tree) {
      let result: string;
      try {
        result = evaluateNode(tree.topNode, graph, node);
        if (isNaN(result as unknown as number)) {
          throw new EvaluationError("Not a number", {
            value: undefined,
            error: "#VALUE!",
          });
        }
        graph.setNodeAttribute(node, "cell", {
          ...cell,
          value: result,
        });
      } catch (e: unknown) {
        if (e instanceof EvaluationError) {
          graph.setNodeAttribute(node, "cell", {
            ...cell,
            error: e.cell.error,
            value: undefined,
          });
        } else {
          throw e;
        }
      }
    }
  });
}

function fromGraph(graph: DirectedGraph, data: TableData) {
  forEachNodeInTopologicalOrder(graph, (node, attr) => {
    data.data[node] = attr.cell;
  });
  return data;
}

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

  const data: TableData = req.body;
  const graph = toGraph(data.data, data.columns, data.rows);
  evaluateGraph(graph);
  const result = fromGraph(graph, data);

  res.json({ message: "Evaluation received", table: result });
});

export default app;