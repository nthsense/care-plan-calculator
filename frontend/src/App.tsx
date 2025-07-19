import { useState } from "react";
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

function App() {
  const [message, setMessage] = useState("");
  const [tableData] = useState({
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
    },
  });

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
    return tableData.columns.map((column) => (
      <TableHead className="w-[100px]">{column.title}</TableHead>
    ));
  };

  const getRow = (index: int) => {
    const numCols = tableData.columns.length;
    const cells = [];
    for (let col of tableData.columns) {
      const cellId: string = col.id + index;
      const data = tableData.data[cellId];
      if (data) {
        cells.push(<TableCell key={cellId}>{data.value}</TableCell>);
      } else {
        cells.push(<TableCell key={cellId}>Empty</TableCell>);
      }
    }
    return cells;
  };

  const getRows = () => {
    const numRows = tableData.rows;
    const rows = [];
    for (let i = 1; i < numRows; i++) {
      rows.push(<TableRow key={i}>{getRow(i)}</TableRow>);
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
        <TableCaption>Care plan calculator</TableCaption>
        <TableHeader>
          <TableRow>{getHeaders()}</TableRow>
        </TableHeader>
        <TableBody>{getRows()}</TableBody>
      </Table>
    </>
  );
}

export default App;
