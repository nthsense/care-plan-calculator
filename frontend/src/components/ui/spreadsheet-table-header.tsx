import React, { useCallback, type ChangeEvent } from "react";
import { TableHead } from "./table";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface SpreadsheetTableHeaderProps {
  className?: string;
  id: string;
  title: string;
  headerUpdate: (id: string, title: string) => void;
  [key: string]: unknown;
}

export const SpreadsheetTableHeader = React.memo(function ({
  className,
  headerUpdate,
  title,
  id,
  ...props
}: SpreadsheetTableHeaderProps) {
  const changeHandler = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      headerUpdate(id, event.target.value);
    },
    [id, headerUpdate],
  );

  return (
    <TableHead className={cn(className, "w-[100px]")} key={id} {...props}>
      <Input className="border-none" value={title} onChange={changeHandler} />
    </TableHead>
  );
});
