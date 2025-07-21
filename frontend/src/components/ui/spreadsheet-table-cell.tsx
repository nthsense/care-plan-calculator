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
  cellUpdate: (id: string, value: string | undefined, formula?: string) => void;
  [key: string]: unknown;
}

/**
 * Extracts the display value for a cell based on its state.
 * The priority is: error > value > formula placeholder > empty string.
 * @param cell The cell data object.
 * @returns The string to be displayed in the cell's input field.
 */
function extractValue(cell: Cell): string {
  return cell.error
    ? cell.error
    : cell.value
      ? cell.value
      : cell.formula
        ? "###"
        : "";
}

/**
 * Determines the appropriate CSS classes for a cell based on its state.
 * @param cell The cell data object.
 * @param editMode Whether the cell is currently in edit mode.
 * @returns A string of Tailwind CSS classes.
 */
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

/**
 * A memoized component that renders a single, editable cell in the spreadsheet.
 * It handles the logic for displaying values, errors, and switching to a
 * formula editor popover when the user types '='.
 */
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

  /**
   * Handles changes to the input field for literal values.
   */
  const handleChange = React. useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      cellUpdate(id, event.target.value);
    },
    [cellUpdate, id],
  );

  /**
   * Detects when a user types '=' to initiate formula editing.
   */
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

  /**
   * Shows the formula editor if the cell is focused and already contains a formula.
   */
  const handleFocus = React.useCallback(() => {
    if (data.formula) {
      setShowFormulaEditor(true);
    }
  }, [data]);

  /**
   * Exits edit mode when the cell loses focus.
   */
  const handleBlur = React.useCallback(() => {
    setEditMode(false);
  }, []);

  /**
   * Handles changes from the FormulaEditor component, updating the cell's formula state.
   */
  const handleFormulaChange = React.useCallback(
    (formula: string) => {
      cellUpdate(id, "###", formula);
    },
    [cellUpdate, id],
  );

  /**
   * Closes the formula editor popover and returns focus to the cell's input field.
   */
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
          data-testid={id}
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