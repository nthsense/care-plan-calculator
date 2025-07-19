export interface TableData {
  rows: number;
  columns: Column[];
  data: Data;
}

export interface Column {
  id: string;
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
