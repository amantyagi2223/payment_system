"use client";

import { useState, useMemo, type ReactNode } from "react";

type SortDirection = "asc" | "desc" | null;

type DataTableProps = {
  headers: string[];
  rows: ReactNode[][];
  emptyLabel?: string;
  minWidths?: number[];
  defaultMaxRows?: number;
};

export default function DataTable({
  headers,
  rows,
  emptyLabel = "No records to display.",
  minWidths,
  defaultMaxRows = 10,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [maxRows, setMaxRows] = useState(defaultMaxRows);
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const maxRowsOptions = [10, 25, 50, 100];

  // Handle sorting
  const sortedRows = useMemo(() => {
    if (sortColumn === null || sortDirection === null) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Get text content from ReactNode
      const getTextContent = (node: ReactNode): string => {
        if (typeof node === "string") return node;
        if (typeof node === "number") return String(node);
        if (!node) return "";
        if (Array.isArray(node)) return node.map(getTextContent).join("");
        if (typeof node === "object" && "props" in node) {
          return getTextContent((node as ReactNode & { props?: { children?: ReactNode } }).props?.children);
        }
        return "";
      };

      const aText = getTextContent(aVal).toLowerCase();
      const bText = getTextContent(bVal).toLowerCase();

      // Try numeric comparison
      const aNum = parseFloat(aText);
      const bNum = parseFloat(bText);
      const aIsNumeric = !isNaN(aNum) && aText === String(aNum);
      const bIsNumeric = !isNaN(bNum) && bText === String(bNum);

      if (aIsNumeric && bIsNumeric) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      return sortDirection === "asc"
        ? aText.localeCompare(bText)
        : bText.localeCompare(aText);
    });
  }, [rows, sortColumn, sortDirection]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedRows.length / maxRows);
  const startIndex = (currentPage - 1) * maxRows;
  const endIndex = startIndex + maxRows;
  const displayRows = sortedRows.slice(startIndex, endIndex);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnIndex);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const handleMaxRowsChange = (newMaxRows: number) => {
    setMaxRows(newMaxRows);
    setCurrentPage(1);
  };

  const getSortIcon = (columnIndex: number) => {
    if (sortColumn !== columnIndex) {
      return (
        <svg className="h-4 w-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortDirection === "asc") {
      return (
        <svg className="h-4 w-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="h-4 w-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="animate-rise-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Show</span>
          <select
            value={maxRows}
            onChange={(e) => handleMaxRowsChange(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          >
            {maxRowsOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-600">entries</span>
        </div>
        <div className="text-sm text-slate-500">
          Showing {startIndex + 1} to {Math.min(endIndex, sortedRows.length)} of {sortedRows.length} entries
        </div>
      </div>

      {/* Table */}
      <div className="scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent max-w-full overflow-x-auto pb-1">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100/80 text-slate-600">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header}
                  className="whitespace-nowrap cursor-pointer px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-slate-200/50"
                  style={minWidths?.[index] ? { minWidth: `${minWidths[index]}px` } : undefined}
                  onClick={() => handleSort(index)}
                >
                  <div className="flex items-center gap-1">
                    {header}
                    {getSortIcon(index)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.length > 0 ? (
              displayRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-slate-100 transition hover:bg-cyan-50/30">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      className="px-5 py-4 align-top text-slate-800"
                      style={minWidths?.[cellIndex] ? { minWidth: `${minWidths[cellIndex]}px` } : undefined}
                    >
                      <div className="max-w-[300px] truncate" title={typeof cell === "string" ? cell : undefined}>
                        {cell}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-5 py-12 text-center text-sm text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
          </div>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, current, and adjacent pages
                return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
              })
              .map((page, index, arr) => {
                const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                return (
                  <span key={page} className="flex items-center">
                    {showEllipsis && (
                      <span className="px-2 text-slate-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        currentPage === page
                          ? "bg-slate-900 text-white"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                );
              })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

