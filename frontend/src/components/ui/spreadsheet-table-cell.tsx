import * as React from "react";
import { TableCell } from "./table";

import { cn } from "@/lib/utils";
import type { Cell } from "@/types/TableData";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { X } from "lucide-react";
import { FormulaEditor } from "./formula-editor";
import { PopoverArrow } from "@radix-ui/react-popover";

interface SpreadsheetTableCellProps {
  className?: string;
  id: string;
  data: Cell;
  cellUpdate: (id: string, value: string, formula?: string) => void;
  [key: string]: unknown;
}

function extractValue(cell: Cell): string {
  return cell.error ? cell.error : cell.formula ? "###" : cell.value;
}

function getClassNames(cell: Cell, editMode: boolean): string {
  let additionalClassName = "";
  if (!cell) {
    additionalClassName = "bg-gray-300";
  } else if (cell.error) {
    additionalClassName = "bg-red-700";
  }

  if (editMode) {
    additionalClassName += " border border-gray-700";
  }
  return additionalClassName;
}

export const SpreadsheetTableCell = React.memo(function ({
  className,
  cellUpdate,
  data,
  id,
  ...props
}: SpreadsheetTableCellProps) {
  const [editMode, setEditMode] = React.useState(false);
  const [showFormulaEditor, setShowFormulaEditor] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      console.log("Cell Changed");
      cellUpdate(id, event.target.value);
    },
    [cellUpdate, id],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        (event.key === "=" &&
          (event.target as HTMLInputElement).selectionStart === 0) ||
        (event.key !== "Tab" &&
          (event.target as HTMLInputElement).value.charAt(0) === "=")
      ) {
        setShowFormulaEditor(true);
      }
    },
    [],
  );

  const handleFocus = React.useCallback(() => {
    if (data.formula) {
      setShowFormulaEditor(true);
    }
  }, [data]);

  const handleBlur = React.useCallback(() => {
    setEditMode(false);
  }, []);

  const handleFormulaChange = React.useCallback(
    (formula: string) => {
      console.log("Formula Changed");
      cellUpdate(id, data.value, formula);
    },
    [cellUpdate, id, data],
  );

  const handleCloseFormulaEditor = React.useCallback(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
    setShowFormulaEditor(false);
  }, [inputRef]);

  const additionalClassName = getClassNames(data, editMode);
  const displayValue: string = extractValue(data);
  const formulaValue: string = data.formula ? data.formula : "";
  const errorValue: string = data.error ? data.error : "";
  const allowEditing = formulaValue.trim() == "" && errorValue.trim() == "";

  return (
    <TableCell
      key={id}
      className={cn(className, additionalClassName, "relative")}
      {...props}
    >
      <Popover open={showFormulaEditor}>
        <Input
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          ref={inputRef}
          readOnly={!allowEditing}
        />
        <PopoverTrigger
          disabled={true}
          tabIndex={-1}
          className="absolute bottom-5 center"
        ></PopoverTrigger>
        <PopoverContent className="relative margin-top-40">
          <PopoverArrow></PopoverArrow>
          Formula editor
          <FormulaEditor
            value={formulaValue}
            onBlur={handleCloseFormulaEditor}
            onChange={handleFormulaChange}
          ></FormulaEditor>
          <Button
            className="absolute top-0 right-0"
            onClick={handleCloseFormulaEditor}
            variant="ghost"
            size="icon"
          >
            <X />
          </Button>
        </PopoverContent>
      </Popover>
    </TableCell>
  );
});
