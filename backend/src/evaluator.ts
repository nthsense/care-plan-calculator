import { DirectedGraph } from "graphology";
import { Cell } from "./types/TableData.js";
import { SyntaxNode, Tree } from "@lezer/common";
import { GraphNodeAttrs } from "./types/GraphNodeAttrs.js";

import { forEachNodeInTopologicalOrder } from "graphology-dag";

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
  console.log(
    node.type.name,
    (
      graph.getNodeAttributes(cellReference) as GraphNodeAttrs
    ).cell.formula?.substring(node.from, node.to),
  );
  switch (node.type.name) {
    case "NameToken":
      results += `"${(
        graph.getNodeAttributes(cellReference) as GraphNodeAttrs
      ).cell.formula?.substring(node.from, node.to)}"`;
      break;
    case "TextToken":
      results += (
        graph.getNodeAttributes(cellReference) as GraphNodeAttrs
      ).cell.formula?.substring(node.from, node.to);
      break;
    case "Eqop":
      // The equal sign is always used to compare inside a formula.
      results += "==";
      break;
    case "Concatop":
      results += "+";
      break;
    case "Neqop":
      results += "!=";
      break;
    case "Percentop":
      results += "* .01";
      break;
    case "BoolToken":
    case "Number":
    case "Mulop":
    case "Plusop":
    case "Divop":
    case "Minop":
    case "Gtop":
    case "Ltop":
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
        if (Number.isNaN(results)) {
          throw "NaN";
        }
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

export default function evaluateGraph(graph: DirectedGraph) {
  forEachNodeInTopologicalOrder(graph, (node, attr) => {
    const { tree, cell } = attr as GraphNodeAttrs;
    if (tree) {
      let result: string;
      try {
        result = evaluateNode(tree.topNode, graph, node);
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
