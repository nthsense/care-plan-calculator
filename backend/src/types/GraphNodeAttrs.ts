import { Cell } from "./TableData.js";
import { Tree } from "@lezer/common";

export interface GraphNodeAttrs {
  tree: Tree;
  cell: Cell;
}
