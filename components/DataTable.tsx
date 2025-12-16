'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading,
  onEdit,
  onDelete,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const hasActions = onEdit || onDelete;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col, idx) => (
            <TableHead key={idx} className={col.className}>
              {col.header}
            </TableHead>
          ))}
          {hasActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="text-center">
              Loading...
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="text-center">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((item) => (
            <TableRow key={item.id}>
              {columns.map((col, idx) => (
                <TableCell key={idx} className={col.className}>
                  {typeof col.accessor === 'function'
                    ? col.accessor(item)
                    : String(item[col.accessor])}
                </TableCell>
              ))}
              {hasActions && (
                <TableCell className="text-right">
                  {onEdit && (
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
