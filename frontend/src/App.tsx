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

function App() {
  const [message, setMessage] = useState("");
  const template: TableData = {
    rows: 10,
    columns: {
      A: { title: "Domain" },
      B: { title: "Sub-domain" },
      C: { title: "Raw Score" },
      D: { title: "v-Scale Score" },
      E: { title: "Notes" },
    },
    data: {
      A1: { value: "20", formula: "=B1*2", error: "" },
      D4: { value: "", formula: "=B1*2", error: "#DIV/0!" },
    },
  };

  const [tableRows, setTableRows] = useState<number>(template.rows);
  const [tableColumns, setTableColumns] = useState<Columns>(template.columns);
  const [tableData, setTableData] = useState<Data>(template.data);

  const handleCellUpdate = useCallback(
    (cellId: string, value: string, formula?: string) => {
      setTableData((tableData) => {
        const newData = { ...tableData };
        const currCellData = newData[cellId];
        newData[cellId] = { ...currCellData, value, formula };
        return { ...tableData, ...newData };
      });
    },
    [],
  );

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

  const handleAddRow = useCallback(() => {
    setTableRows((rows) => rows + 1);
  }, []);

  const handleHeaderUpdate = useCallback((id: string, title: string) => {
    setTableColumns((tableColumns) => {
      const newColumns = { ...tableColumns };
      const currColumn = newColumns[id];
      newColumns[id] = { ...currColumn, title };
      return { ...tableColumns, ...newColumns };
    });
  }, []);

  const handleEvaluate = async () => {
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: "Hello from frontend!" }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      console.error("Error calling evaluate endpoint:", error);
      setMessage("Error connecting to backend.");
    }
  };

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

  const getRow = (index: number) => {
    const cells = [];
    for (const id in tableColumns) {
      const cellId: string = id + index;
      let data = tableData[cellId];
      if (data === undefined) {
        data = { value: "" };
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

  const getRows = () => {
    const numRows = tableRows;
    const rows = [];
    for (let i = 1; i < numRows; i++) {
      rows.push(<TableRow key={"row" + i}>{getRow(i)}</TableRow>);
    }
    return rows;
  };
  return (
    <>
      <h1>Care Plan Calculator</h1>
      <div className="card">
        <Button onClick={handleEvaluate}>Evaluate</Button>
      </div>
      <p className="read-the-docs">{message}</p>
      <div className="relative">
        <Table>
          <TableCaption>
            Vineland Adaptive Behavior Scales, Third Edition (Vineland-3)
          </TableCaption>
          <TableHeader>
            <TableRow>{getHeaders()}</TableRow>
          </TableHeader>
          <TableBody>{getRows()}</TableBody>
        </Table>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0"
          onClick={handleAddColumn}
        >
          <PlusSquareIcon></PlusSquareIcon>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-0 left-0"
          onClick={handleAddRow}
        >
          <PlusSquareIcon></PlusSquareIcon>
        </Button>
      </div>
    </>
  );
}

export default App;
