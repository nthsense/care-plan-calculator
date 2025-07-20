export interface TableData {
  rows: number;
  columns: Columns;
  data: Data;
}

export interface Columns {
  [key: string]: Column;
}

export interface Column {
  title: string;
}

export interface Data {
  [key: string]: Cell;
}

export interface Cell {
  value: string;
  formula?: string;
  error?: string;
}
