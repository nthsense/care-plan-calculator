// TODO: these are the exact same types used in the frontend and should be
// factored into a shared lib
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

export interface Data extends Iterable<Data> {
  [key: string]: Cell;
}

export interface Cell {
  value: string | undefined;
  formula?: string;
  error?: string;
}
