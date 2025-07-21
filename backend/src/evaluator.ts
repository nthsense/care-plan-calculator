import Graph, { DirectedGraph } from "graphology";
import { Cell } from "./types/TableData.js";
import { SyntaxNode } from "@lezer/common";
import { GraphNodeAttrs } from "./types/GraphNodeAttrs.js";

import { forEachNodeInTopologicalOrder } from "graphology-dag";

/**
 * Custom error class for handling specific formula evaluation errors.
 * This allows us to attach the specific cell context to the error for better handling.
 */
class EvaluationError extends Error {
  constructor(message: string, cell: Cell) {
    super(message);
    this.name = "EvaluationError"; // Set the name to the class name
    this.cell = cell;
  }
  public cell: Cell;
}

interface PipelineFunctionAcc {
  value: string;
  break: boolean;
  append: (value: string) => PipelineFunctionAcc;
}
interface PipelineFunction {
  (
    node: SyntaxNode,
    graph: DirectedGraph,
    cellReference: string,
    accumulator: PipelineFunctionAcc,
  ): PipelineFunctionAcc;
}

/**
 * Given a parse tree node, return the text represented by that node.
 * (The parse tree only keeps track of cursor positions, so we get
 * the original formula text from the graph and substring it)
 * @param node The Lezer tree node
 * @param graph The graph instance
 * @param cellReference The identifier of the cell
 * @returns
 */
function getStringForNode(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
) {
  return (
    graph.getNodeAttributes(cellReference) as GraphNodeAttrs
  ).cell.formula?.substring(node.from, node.to);
}

/**
 * Processes the children of the current node.
 * @param node The current syntax node.
 * @param graph The graph instance.
 * @param cellReference The reference of the cell being evaluated.
 * @param acc The accumulator for the pipeline.
 * @returns The updated accumulator.
 */
function processChildren(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
  acc: PipelineFunctionAcc,
): PipelineFunctionAcc {
  if (node.firstChild) {
    acc.append(evaluateNode(node.firstChild, graph, cellReference));
  }
  return acc;
}

/**
 * Ignores the first "=" in the formula at the top-level "Program" node.
 * @param node The current syntax node.
 * @param graph The graph instance.
 * @param cellReference The reference of the cell being evaluated.
 * @param acc The accumulator for the pipeline.
 * @returns The updated accumulator.
 */
function ignoreProgramNode(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
  acc: PipelineFunctionAcc,
): PipelineFunctionAcc {
  if (node.type.name == "Eqop" && node.parent?.type.name == "Program") {
    if (node.nextSibling) {
      acc.append(evaluateNode(node.nextSibling, graph, cellReference));
    }
    acc.break = true;
  }

  return acc;
}

/**
 * Processes text-based tokens, throwing an error for unsupported names.
 * @param node The current syntax node.
 * @param graph The graph instance.
 * @param cellReference The reference of the cell being evaluated.
 * @param acc The accumulator for the pipeline.
 * @returns The updated accumulator.
 */
function processTextTokens(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
  acc: PipelineFunctionAcc,
): PipelineFunctionAcc {
  switch (node.type.name) {
    case "NameToken":
      // TODO: look up supported names when we add support for functions like SUM, VLOOKUP, and named references
      throw new EvaluationError("Unsupported name", {
        value: undefined,
        error: "#NAME!",
      });
    case "TextToken":
      acc.append(getStringForNode(node, graph, cellReference)!);
      break;
  }
  return acc;
}

/**
 * Converts formula operators to their JavaScript equivalents.
 * @param node The current syntax node.
 * @param graph The graph instance.
 * @param cellReference The reference of the cell being evaluated.
 * @param acc The accumulator for the pipeline.
 * @returns The updated accumulator.
 */
function convertOperators(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
  acc: PipelineFunctionAcc,
): PipelineFunctionAcc {
  switch (node.type.name) {
    case "Eqop":
      // The equal sign is always used to compare inside a formula.
      acc.append("==");
      break;
    case "Concatop":
      acc.append("+");
      break;
    case "Neqop":
      acc.append("!=");
      break;
    case "Percentop":
      acc.append("* .01");
      break;
    case "Expop":
      acc.append("**");
      break;
  }

  return acc;
}

/**
 * Processes tokens that have a direct JavaScript equivalent.
 * @param node The current syntax node.
 * @param graph The graph instance.
 * @param cellReference The reference of the cell being evaluated.
 * @param acc The accumulator for the pipeline.
 * @returns The updated accumulator.
 */
function processStableTokens(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
  acc: PipelineFunctionAcc,
): PipelineFunctionAcc {
  switch (node.type.name) {
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
      acc.append(getStringForNode(node, graph, cellReference)!);
      break;
  }

  return acc;
}

/**
 * Processes cell tokens, resolving their values from the graph.
 * @param node The current syntax node.
 * @param graph The graph instance.
 * @param cellReference The reference of the cell being evaluated.
 * @param acc The accumulator for the pipeline.
 * @returns The updated accumulator.
 */
function processCellTokens(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
  acc: PipelineFunctionAcc,
): PipelineFunctionAcc {
  if (node.type.name === "CellToken") {
    const ref = getStringForNode(node, graph, cellReference);

    if (!graph.hasNode(ref)) {
      throw new EvaluationError("Ref error", {
        value: undefined,
        error: "#REF!",
      });
    }

    acc.append(
      (graph.getNodeAttributes(ref) as GraphNodeAttrs).cell.value || "0",
    );
  }

  return acc;
}

/**
 * Processes function call nodes.
 * @param node The current syntax node.
 * @param graph The graph instance.
 * @param cellReference The reference of the cell being evaluated.
 * @param acc The accumulator for the pipeline.
 * @returns The updated accumulator.
 */
function processFunctionCalls(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
  acc: PipelineFunctionAcc,
): PipelineFunctionAcc {
  if (node.type.name === "FunctionCall") {
    try {
      const func = new Function(`return ${acc.value}`);
      acc.value = func();
      if (Number.isNaN(acc.value)) {
        throw "NaN";
      }
    } catch (e: unknown) {
      throw new EvaluationError((e as Error).message, {
        value: undefined,
        error: "#VALUE!",
      });
    }
  }

  return acc;
}

/**
 * Processes sibling nodes in the syntax tree.
 * @param node The current syntax node.
 * @param graph The graph instance.
 * @param cellReference The reference of the cell being evaluated.
 * @param acc The accumulator for the pipeline.
 * @returns The updated accumulator.
 */
function processSiblings(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
  acc: PipelineFunctionAcc,
): PipelineFunctionAcc {
  if (node.nextSibling) {
    const nextResult = evaluateNode(node.nextSibling, graph, cellReference);
    if (node.type.name == "Divop" && nextResult === "0") {
      throw new EvaluationError("Divide by zero", {
        value: undefined,
        error: "#DIV/0!",
      });
    } else {
      acc.append(evaluateNode(node.nextSibling, graph, cellReference));
    }
  }
  return acc;
}

/**
 * Executes a series of processing functions against a context. A function can stop the pipeline processing by setting "break:true" on the accumulator
 * @param context The context for the pipeline.
 * @param functions The functions to execute.
 * @returns The accumulated value.
 */
function pipeline(
  context: [SyntaxNode, DirectedGraph, string, PipelineFunctionAcc],
  ...functions: PipelineFunction[]
): PipelineFunctionAcc {
  let acc = context[3];
  for (const func of functions) {
    func(...context);
    if (acc.break) {
      return acc;
    }
  }
  return acc;
}

/**
 * Recursively traverses a Lezer syntax tree for a formula and builds a JavaScript-executable string.
 * It translates formula operators (e.g., <>, ^, &) into their JS equivalents (!=, **, +).
 * @param node The current node in the syntax tree to process.
 * @param graph The full dependency graph, used to look up the values of referenced cells.
 * @param cellReference The ID of the cell being evaluated (e.g., "C1").
 * @returns A string that can be safely executed by the JavaScript Function constructor.
 * @throws {EvaluationError} Throws a custom error for specific evaluation failures like #REF! or #DIV/0!.
 */
function evaluateNode(
  node: SyntaxNode,
  graph: DirectedGraph,
  cellReference: string,
): string {
  let results = "";

  results += pipeline(
    [
      node,
      graph,
      cellReference,
      {
        value: "",
        break: false,
        append: function (value: string) {
          this.value += value;
          return this;
        },
      },
    ],
    processChildren,
    ignoreProgramNode,
    processTextTokens,
    convertOperators,
    processStableTokens,
    processCellTokens,
    processFunctionCalls,
    processSiblings,
  ).value;
  return results;
}

/**
 * Traverses the dependency graph in topological order and evaluates each formula cell.
 * It catches any EvaluationErrors and updates the cell with the appropriate error message.
 * @param graph The dependency graph to evaluate.
 */
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
