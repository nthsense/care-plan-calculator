import { useCallback, useState } from "react";
import "./App.css";
import { Button } from "./components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { type Column, type Data, type TableData } from "./types/TableData";
import { SpreadsheetTableCell } from "./components/ui/spreadsheet-table-cell";

function App() {
  const [message, setMessage] = useState("");
  const template: TableData = {
    rows: 10,
    columns: [
      { id: "A", title: "Domain" },
      { id: "B", title: "Sub-domain" },
      { id: "C", title: "Raw Score" },
      { id: "D", title: "v-Scale Score" },
      { id: "E", title: "Notes" },
    ],
    data: {
      A1: { value: "20", formula: "=B1*2", error: "" },
      D4: { value: "", formula: "=B1*2", error: "#DIV/0!" },
    },
  };

  const [tableRows, setTableRows] = useState<number>(template.rows);
  const [tableColumns, setTableColumns] = useState<Column[]>(template.columns);
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
    return tableColumns.map((column) => (
      <TableHead className="w-[100px]" key={column.id}>
        {column.title}
      </TableHead>
    ));
  };

  const getRow = (index: number) => {
    const cells = [];
    for (const col of tableColumns) {
      const cellId: string = col.id + index;
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

      <Table>
        <TableCaption>
          Vineland Adaptive Behavior Scales, Third Edition (Vineland-3)
        </TableCaption>
        <TableHeader>
          <TableRow>{getHeaders()}</TableRow>
        </TableHeader>
        <TableBody>{getRows()}</TableBody>
      </Table>
    </>
  );
}

export default App;
