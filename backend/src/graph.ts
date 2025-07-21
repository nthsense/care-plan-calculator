import { DirectedGraph } from "graphology";
import { Cell, Columns, Data, TableData } from "./types/TableData.js";
import { parser } from "./parser/syntax.grammar.js";
import { forEachNodeInTopologicalOrder, willCreateCycle } from "graphology-dag";
import { SyntaxNodeRef, Tree } from "@lezer/common";

/**
 * Validates if a given cell ID (e.g., "A1", "Z100") exists within the defined grid.
 * @param id The cell ID to validate.
 * @param columns The map of columns in the grid.
 * @param rows The total number of rows in the grid.
 * @returns True if the cell is valid, false otherwise.
 */
function isValidCell(id: string, columns: Columns, rows: number) {
  const matches = id.match(/([a-zA-Z]+)([0-9]+)/)!;
  const colId = matches[1];
  const rowNum = parseInt(matches[2], 10);
  return columns[colId] != undefined && rowNum > 0 && rowNum <= rows;
}

/**
 * Constructs a directed graph representing the dependencies between cells.
 * Each cell is a node, and an edge from A to B means B depends on A.
 * This function also detects and flags circular references.
 * @param tableData The raw data object containing all cell information.
 * @param columns The map of columns in the grid.
 * @param rows The total number of rows in the grid.
 * @returns A DirectedGraph instance representing the spreadsheet's dependency structure.
 */
export function toGraph(tableData: Data, columns: Columns, rows: number) {
  const graph = new DirectedGraph();
  for (const key in tableData) {
    const cell: Cell = {
      value: tableData[key].value,
      formula: tableData[key].formula,
      error: undefined,
    };
    if (cell.formula) {
      const tree: Tree = parser.parse(cell.formula);
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
              if (!graph.hasDirectedEdge(tokenText, key)) {
                graph.addDirectedEdge(tokenText, key);
              }
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

/**
 * Populates the original TableData object with the final, evaluated cell data from the graph.
 * It traverses the graph in topological order to ensure correct data retrieval.
 * @param graph The evaluated dependency graph.
 * @param data The original TableData object to populate.
 * @returns The populated TableData object.
 */
export function fromGraph(graph: DirectedGraph, data: TableData) {
  forEachNodeInTopologicalOrder(graph, (node, attr) => {
    data.data[node] = attr.cell;
  });
  return data;
}