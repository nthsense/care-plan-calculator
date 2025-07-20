import express from "express";
import cors from "cors";
import { Cell, Data, TableData } from "./types/TableData.js";
import { DirectedGraph } from "graphology";
import { parser } from "./parser/syntax.grammar.js";
import { table } from "node:console";
import { SyntaxNode, SyntaxNodeRef, Tree } from "@lezer/common";
import {
  forEachNodeInTopologicalOrder,
  topologicalSort,
  willCreateCycle,
} from "graphology-dag";

const app = express();
const port = 3001;

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
    }
  }

  return graph;
}

function evaluate(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
) {
  let results = "";

  // Depth first
  if (node.firstChild) {
    results += evaluate(node.firstChild, graph, cellReference);
  }

  switch (node.type.name) {
    case "CellToken":
      const ref = (
        graph.getNodeAttributes(cellReference) as GraphNodeAttrs
      ).cell.formula?.substring(node.from, node.to);
      console.log(ref, graph.getNodeAttributes(ref));
      results += `LOOKUP(${ref}):[${(graph.getNodeAttributes(ref) as GraphNodeAttrs).cell.value}]`;
    default:
      results += (
        graph.getNodeAttributes(cellReference) as GraphNodeAttrs
      ).cell.formula?.substring(node.from, node.to);
  }

  // Then breadth
  if (node.nextSibling) {
    results += evaluate(node.nextSibling, graph, cellReference);
  }

  return results;
}

function evaluateGraph(graph: DirectedGraph) {
  forEachNodeInTopologicalOrder(graph, (node, attr, generationIndex) => {
    // Note that generationIndex will be monotonically increasing from 0 to n.
    console.log(node, attr, generationIndex);
    const { tree, cell } = attr as GraphNodeAttrs;
    if (tree) {
      console.log(evaluate(tree.topNode, graph, node));
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

function fromGraph() {}

app.post("/api/evaluate", (req, res) => {
  console.log("Received request:", req.body);
  const data: TableData = req.body;
  evaluateGraph(toGraph(data.data));

  res.json({ message: "Evaluation received", data: req.body });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
