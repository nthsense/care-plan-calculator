import { useCallback, useState } from "react";
import "./App.css";
import { Button } from "./components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { type Columns, type Data, type TableData } from "./types/TableData";
import { SpreadsheetTableCell } from "./components/ui/spreadsheet-table-cell";
import { PlusSquareIcon } from "lucide-react";
import { SpreadsheetTableHeader } from "./components/ui/spreadsheet-table-header";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./components/ui/tooltip";

import * as tmpl from "./templates/starter.json";

/**
 * The main application component.
 * Manages the entire state of the spreadsheet grid and handles user interactions.
 */
function App() {
  const [message, setMessage] = useState("");

  const template: TableData = tmpl;

  const [title] = useState<string>(template.title!);
  const [tableRows, setTableRows] = useState<number>(template.rows);
  const [tableColumns, setTableColumns] = useState<Columns>(template.columns);
  const [tableData, setTableData] = useState<Data>(template.data);

  /**
   * A memoized callback for updating the state of a single cell.
   * @param cellId The ID of the cell to update (e.g., "A1").
   * @param value The new literal value of the cell.
   * @param formula The new formula for the cell.
   */
  const handleCellUpdate = useCallback(
    (cellId: string, value: string | undefined, formula?: string) => {
      setTableData((tableData) => {
        const newData = { ...tableData };
        const currCellData = newData[cellId];
        newData[cellId] = { ...currCellData, value, formula };
        return newData;
      });
    },
    [],
  );

  /**
   * A memoized callback for adding a new column to the grid.
   * Enforces a maximum of 26 columns (A-Z).
   */
  const handleAddColumn = useCallback(() => {
    setTableColumns((columns) => {
      const numColumns = Object.keys(columns).length;

      //Limit to 26 columns
      if (numColumns == 26) {
        return columns;
      }

      // This is a slick way to get a letter of the English alphabet from a number.
      // It doesn't work past numColumns = 26 however.
      const nextLetter = (numColumns + 10).toString(36).toUpperCase();
      return {
        ...columns,
        [nextLetter]: { title: "New Column" },
      };
    });
  }, []);

  /**
   * A memoized callback for adding a new row to the grid.
   */
  const handleAddRow = useCallback(() => {
    setTableRows((rows) => rows + 1);
  }, []);

  /**
   * A memoized callback for updating the title of a column.
   * @param id The ID of the column to update (e.g., "A").
   * @param title The new title for the column.
   */
  const handleHeaderUpdate = useCallback((id: string, title: string) => {
    setTableColumns((tableColumns) => {
      const newColumns = { ...tableColumns };
      const currColumn = newColumns[id];
      newColumns[id] = { ...currColumn, title };
      return { ...tableColumns, ...newColumns };
    });
  }, []);

  /**
   * A memoized callback for sending the current grid state to the backend for evaluation.
   * It updates the local cell data with the results returned from the API.
   */
  const handleEvaluate = useCallback(async () => {
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: tableRows,
          columns: tableColumns,
          data: tableData,
        }),
      });
      const res = await response.json();
      setTableData(res.table.data);
      setMessage("");
    } catch (error) {
      setMessage("Error connecting to backend.");
    }
  }, [tableRows, tableColumns, tableData]);

  /**
   * Renders the table header components.
   * @returns An array of SpreadsheetTableHeader components.
   */
  const getHeaders = () => {
    const headers = [];
    for (const id in tableColumns) {
      headers.push(
        <SpreadsheetTableHeader
          className="w-[100px]"
          key={id}
          id={id}
          {...tableColumns[id]}
          headerUpdate={handleHeaderUpdate}
        />,
      );
    }
    return headers;
  };

  /**
   * Renders all the cells for a single row.
   * @param index The 1-based index of the row to render.
   * @returns An array of SpreadsheetTableCell components.
   */
  const getRow = (index: number) => {
    const cells = [];
    for (const id in tableColumns) {
      const cellId: string = id + index;
      let data = tableData[cellId];
      if (data === undefined) {
        data = { value: undefined };
      }
      cells.push(
        <SpreadsheetTableCell
          key={cellId}
          id={cellId}
          data={data}
          cellUpdate={handleCellUpdate}
        />,
      );
    }
    return cells;
  };

  /**
   * Renders all the rows in the table body.
   * @returns An array of TableRow components.
   */
  const getRows = () => {
    const numRows = tableRows;
    const rows = [];
    for (let i = 1; i <= numRows; i++) {
      rows.push(<TableRow key={"row" + i}>{getRow(i)}</TableRow>);
    }
    return rows;
  };
  return (
    <>
      <h1 className="text-xl">Care Plan Calculator</h1>
      <p className="read-the-docs text-left">{title}</p>
      <div className="relative text-xs text-left" style={{ height: "40px" }}>
        Add columns or rows using the "+" buttons, type "=" in a cell to enter a
        formula, click on a column heading to edit. Click "Evaluate" to see your
        results.
        <Button className="absolute top-0 right-0" onClick={handleEvaluate}>
          Evaluate
        </Button>
      </div>
      <div className="relative">
        <Table>
          <TableCaption>{message}</TableCaption>
          <TableHeader>
            <TableRow>{getHeaders()}</TableRow>
          </TableHeader>
          <TableBody>{getRows()}</TableBody>
        </Table>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0"
              style={{ right: "-35px" }}
              data-testid="addColumn"
              onClick={handleAddColumn}
            >
              <PlusSquareIcon></PlusSquareIcon>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Column</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-0 left-0"
              style={{ bottom: "-20px" }}
              data-testid="addRow"
              onClick={handleAddRow}
            >
              <PlusSquareIcon></PlusSquareIcon>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Row</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}

export default App;
