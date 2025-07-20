import express from "express";
import cors from "cors";
import { Cell, Data, TableData } from "./types/TableData.js";
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

function toGraph(tableData: Data) {
  const graph = new DirectedGraph();
  for (const key in tableData) {
    const cell = tableData[key];
    if (cell.formula) {
      const tree = parser.parse(cell.formula);
      if (graph.hasNode(key)) {
        graph.updateNode(key, (attrs) => ({ ...attrs, tree, cell }));
      } else {
        graph.addNode(key, { tree, cell });
      }
      tree.iterate({
        enter: (node: SyntaxNodeRef) => {
          console.log(
            node.name,
            node.type.name,
            cell.formula?.substring(node.from, node.to),
          );

          // TODO: Implement handling for RangeToken (ex, spread A1:D1 to A1, B1, C1, D1)
          if (node.type.name === "CellToken") {
            const tokenText = cell.formula?.substring(node.from, node.to);
            const cycle = willCreateCycle(graph, tokenText, key);
            if (!cycle) {
              if (!graph.hasNode(tokenText)) {
                graph.addNode(tokenText, { cell: { value: undefined } });
              }
              graph.addDirectedEdge(tokenText, key);
            } else {
              cell.error = "Cycle!!";
            }
          }
          return true;
        },
      });
      printSyntaxTree(tree, cell.formula);
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

function evaluateNode(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
) {
  let results = "";
  console.log(
    cellReference,
    node.type.name,
    (
      graph.getNodeAttributes(cellReference) as GraphNodeAttrs
    ).cell.formula?.substring(node.from, node.to),
  );
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
    case "Expop":
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
    case "CellToken":
      const ref = (
        graph.getNodeAttributes(cellReference) as GraphNodeAttrs
      ).cell.formula?.substring(node.from, node.to);
      results += (graph.getNodeAttributes(ref) as GraphNodeAttrs).cell.value;
      break;
    case "FunctionCall":
      console.log("eval", results);
      try {
        results = eval(results);
      } catch (e: unknown) {
        console.log("ERROR", (e as Error).message, results);
        results = "ERROR! " + (e as Error).message;
      }
      break;
    default:
      results += "";
  }

  // Then breadth
  if (node.nextSibling) {
    results += evaluateNode(node.nextSibling, graph, cellReference);
  }

  return results;
}

function evaluateGraph(graph: DirectedGraph) {
  forEachNodeInTopologicalOrder(graph, (node, attr) => {
    const { tree, cell } = attr as GraphNodeAttrs;
    if (tree) {
      const result = evaluateNode(tree.topNode, graph, node);
      if (result.startsWith("ERROR!")) {
        graph.setNodeAttribute(node, "cell", {
          ...cell,
          error: result,
          value: undefined,
        });
      } else {
        graph.setNodeAttribute(node, "cell", {
          ...cell,
          value: result,
          error: undefined,
        });
      }
    }
  });
}
/**
 * A helper function to print the syntax tree to the console for debugging.
 * This version uses tree.iterate for a simpler and more robust traversal.
 * @param tree The Lezer syntax tree.
 * @param input The original input string.
 */
function printSyntaxTree(tree: Tree, input: string) {
  console.log("--- Syntax Tree ---");
  let indent = "  ";
  tree.iterate({
    enter(node) {
      const nodeName = node.type.name;
      const nodeText = input.substring(node.from, node.to);
      console.log(
        `${indent.slice(2)}${nodeName} [${node.from}-${node.to}]: "${nodeText}"`,
      );
      indent += "  ";
      return true; // Continue traversal
    },
    leave() {
      indent = indent.slice(0, -2);
    },
  });
  console.log("---------------------");
}

function fromGraph(graph: DirectedGraph, data: TableData) {
  forEachNodeInTopologicalOrder(graph, (node, attr) => {
    console.log(node, attr.cell);
    data.data[node] = attr.cell;
  });
  return data;
}

app.post("/api/evaluate", (req, res) => {
  console.log("Received request:", req.body);
  const data: TableData = req.body;
  const graph = toGraph(data.data);
  evaluateGraph(graph);
  const result = fromGraph(graph, data);

  res.json({ message: "Evaluation received", table: result });
});

export default app;
