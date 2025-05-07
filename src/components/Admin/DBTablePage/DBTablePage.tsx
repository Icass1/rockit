"use client";

import type { Column } from "@/lib/db/db";
import { debounce } from "lodash";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Edit,
    Plus,
    RotateCw,
    Trash2,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Cell } from "./Cell";
import type {
    ColumnFiltersType,
    ColumnType,
    DebounceFetchType,
    RequestType,
    Row,
} from "./types";
import { TableContext } from "./tableContext";
import { InsertPopup } from "./InsertPopup";
import { EditPopup } from "./EditPopup";
import { Header } from "./Header";
import Link from "next/link";

export default function DBTablePage({
    table,
    tables,
    dbFile,
}: {
    table: string;
    tables?: string[];
    dbFile: string;
}) {
    const [data, setData] = useState<Row[] | undefined>();
    const [columns, setColumns] = useState<ColumnType[]>();

    const [sortBy, setSortBy] = useState<string | undefined>();
    const [sortAscending, setSortAscending] = useState<boolean>(true);

    const [offset, setOffset] = useState(0);
    const [maxRows, setMaxRows] = useState(20);
    const [totalRows, setTotalRows] = useState(0);

    const pageSize = 20;

    const [scroll, setScroll] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const rowHeight = 24;

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersType>();

    const [insertPopupOpen, setInsertPopOpen] = useState(false);
    const [editPopup, setEditPopup] = useState<number | undefined>(undefined);

    const fetchDebounce = useRef<DebounceFetchType>(null);

    const [rowHover, setRowHover] = useState<number>();

    useEffect(() => {
        fetchDebounce.current = debounce(
            (
                maxRows: number,
                columnFilters: ColumnFiltersType,
                offset: number,
                sortBy: string,
                sortAscending: boolean
            ) => {
                const request: RequestType = {
                    table: table,
                    maxRows: maxRows,
                    filter: columnFilters
                        ? Object.entries(columnFilters)
                              .map((entry) => {
                                  return {
                                      exact: entry[1].exact,
                                      column: entry[0],
                                      text: entry[1].text,
                                      invert: entry[1].invert,
                                  };
                              })
                              .filter((columnFilter) => columnFilter.text)
                        : [],
                    offset: offset,
                    sortColumn: sortBy,
                    ascending: sortAscending,
                    dbFile,
                };

                fetch("/api/admin/db", {
                    method: "POST",
                    body: JSON.stringify(request),
                }).then((response) => {
                    if (response.ok) {
                        response.json().then((data) => {
                            setData(
                                data.data.map((row: object, index: number) => {
                                    return {
                                        row: row,
                                        index: index + data.offset,
                                    };
                                })
                            );
                            setTotalRows(data.totalRows);
                            if (data.data.length == 0) return;

                            const tempColumns: ColumnType[] = [];
                            const tempColumnFilters: {
                                [key: string]: {
                                    text: string;
                                    invert: boolean;
                                    exact: boolean;
                                };
                            } = {};

                            (data.columns as Column[]).forEach((column) => {
                                tempColumns.push({
                                    name: column.name,
                                    width: 300,
                                    type: column.type,
                                    key: column.pk == 1 ? true : false,
                                });
                                tempColumnFilters[column.name] = {
                                    text: "",
                                    invert: false,
                                    exact: false,
                                };
                            });
                            if (!columnFilters)
                                setColumnFilters(tempColumnFilters);
                            setColumns(tempColumns);
                        });
                    } else {
                        // Alert user response returned error
                    }
                });
            },
            100
        );
    }, [table, dbFile]);

    useEffect(() => {
        if (!scrollRef.current) return;
        if (!fetchDebounce.current) return;

        const newOffset = Math.floor(
            (scroll + scrollRef.current.offsetHeight / 2) / rowHeight / pageSize
        );

        if (newOffset == 0) {
            setOffset(0);
            setMaxRows(pageSize * 2);
        } else {
            setOffset((newOffset - 1) * pageSize);
            setMaxRows(pageSize * 3);
        }
    }, [scroll, fetchDebounce]);

    useEffect(() => {
        if (!fetchDebounce.current) return;
        fetchDebounce.current(
            maxRows,
            columnFilters,
            offset,
            sortBy,
            sortAscending
        );
    }, [fetchDebounce, maxRows, sortBy, sortAscending, columnFilters, offset]);

    const handleDelete = (index: number) => {
        if (!data) {
            console.error("data is not defined");
            return;
        }

        const primaryKey = columns?.find((column) => column.key);
        if (!primaryKey) {
            // Tell user primaryKey couldn't be found.
            return;
        }

        const primaryKeyValue = data[index - offset].row[primaryKey.name];

        if (!primaryKeyValue) {
            console.error("primaryKeyValue is not defined");
            return;
        }

        fetch("/api/admin/db", {
            method: "DELETE",
            body: JSON.stringify({
                table: table,
                primaryKey: {
                    column: primaryKey.name,
                    value: primaryKeyValue,
                },
                dbFile,
            }),
        }).then((response) => {
            if (response.ok) {
                if (fetchDebounce.current)
                    fetchDebounce.current(
                        maxRows,
                        columnFilters,
                        offset,
                        sortBy,
                        sortAscending
                    );
            } else {
                // Notify user there has been an error.
            }
        });
    };

    return (
        <TableContext.Provider
            value={{
                setEditPopup,
                totalRows,
                data,
                maxRows,
                offset,
                fetchDebounce,
                setInsertPopOpen,
                table,
                setSortBy,
                columns,
                sortBy,
                sortAscending,
                setSortAscending,
                columnFilters,
                setColumnFilters,
                dbFile,
            }}
        >
            <div
                className="relative h-full w-full pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24"
                onClick={(e) => {
                    if (
                        document
                            .querySelector("#base-popup")
                            ?.contains(e.target as Node)
                    )
                        return;
                    if (insertPopupOpen) setInsertPopOpen(false);
                    if (editPopup) setEditPopup(undefined);
                }}
            >
                {insertPopupOpen && <InsertPopup />}
                {typeof editPopup == "number" && (
                    <EditPopup index={editPopup} />
                )}
                <div
                    className={
                        "grid h-full w-full grid-cols-[100px_1fr] grid-rows-[min-content_1fr_min-content] " +
                        (insertPopupOpen ||
                            (typeof editPopup == "number" &&
                                "pointer-events-none opacity-50 select-none"))
                    }
                    style={{
                        gridTemplateAreas:
                            '"header header" "left-panel main" "footer footer"',
                    }}
                >
                    <div
                        className="flex h-6 w-full flex-row items-center gap-x-2 bg-[#212225] px-1 text-sm"
                        style={{ gridArea: "header" }}
                    >
                        <RotateCw
                            className="h-4 w-4 cursor-pointer"
                            onClick={() => {
                                if (fetchDebounce.current)
                                    fetchDebounce.current(
                                        maxRows,
                                        columnFilters,
                                        offset,
                                        sortBy,
                                        sortAscending
                                    );
                            }}
                        />
                        Rows: {totalRows}
                    </div>
                    <div
                        style={{ gridArea: "left-panel" }}
                        className="flex h-full w-full flex-col border-t border-r border-solid border-[#373838] bg-[#212225] p-1"
                    >
                        {tables?.map((table) => (
                            <Link
                                key={table}
                                href={`/admin/db/${dbFile}/${table}`}
                            >
                                {table}
                            </Link>
                        ))}
                    </div>
                    <div
                        className="grid h-full w-full grid-cols-[70px_1fr] grid-rows-[min-content_1fr] overflow-auto scroll-smooth bg-[#28282b]"
                        style={{
                            gridTemplateAreas:
                                '"main-corner main-header" "main-left main-main"',
                            gridArea: "main",
                        }}
                        onScroll={(e) => {
                            setScroll(e.currentTarget.scrollTop);
                        }}
                        ref={scrollRef}
                    >
                        <Header />
                        <div
                            style={{ gridArea: "main-corner" }}
                            className="sticky top-0 left-0 z-20 border-t border-r border-b border-solid border-[#373838] bg-[#212225]"
                        />

                        <div
                            style={{ gridArea: "main-left" }}
                            className="sticky left-0 z-10 border-r border-solid border-[#373838] bg-[#212225]"
                        >
                            {data &&
                                data.map((row) => {
                                    return (
                                        <div
                                            key={row.index}
                                            className="absolute grid w-full grid-cols-[1fr_min-content] px-1 text-right text-sm text-neutral-300"
                                            style={{
                                                height: rowHeight + "px",
                                                top:
                                                    row.index * rowHeight +
                                                    "px",
                                            }}
                                            onMouseEnter={() => {
                                                setRowHover(row.index);
                                            }}
                                            onMouseLeave={() => {
                                                setRowHover(undefined);
                                            }}
                                        >
                                            <div className="flex flex-row gap-x-1">
                                                {row.index == rowHover && (
                                                    <Trash2
                                                        onClick={() => {
                                                            handleDelete(
                                                                row.index
                                                            );
                                                        }}
                                                        className={
                                                            "h-4 w-4 cursor-pointer " +
                                                            (dbFile ===
                                                            "current"
                                                                ? ""
                                                                : "pointer-events-none opacity-50")
                                                        }
                                                    />
                                                )}
                                                {row.index == rowHover && (
                                                    <Edit
                                                        onClick={() => {
                                                            setEditPopup(
                                                                row.index
                                                            );
                                                        }}
                                                        className={
                                                            "h-4 w-4 cursor-pointer" +
                                                            (dbFile ===
                                                            "current"
                                                                ? ""
                                                                : "pointer-events-none opacity-50")
                                                        }
                                                    />
                                                )}
                                            </div>
                                            <label>
                                                {row.index == rowHover
                                                    ? ""
                                                    : row.index + 1}
                                            </label>
                                        </div>
                                    );
                                })}
                        </div>
                        <div
                            className="sticky bottom-0 left-0 z-10 flex w-full flex-row items-center justify-between border-t border-r border-solid border-[#373838] bg-[#212225] p-[1px] px-1 text-right"
                            style={{
                                top: 0 + "px",
                            }}
                        >
                            <Plus
                                className="h-4 w-4 cursor-pointer hover:scale-105"
                                onClick={() => {
                                    setInsertPopOpen(true);
                                }}
                            ></Plus>
                            <label className="text-sm text-neutral-500">
                                {totalRows + 1}
                            </label>
                        </div>

                        <div
                            className="relative h-full w-full"
                            style={{ gridArea: "main-main" }}
                        >
                            <div
                                className=""
                                style={{ height: totalRows * rowHeight }}
                            />
                            {data &&
                                data.map((row) => {
                                    return (
                                        <div
                                            key={row.index}
                                            onMouseEnter={() => {
                                                setRowHover(row.index);
                                            }}
                                            onMouseLeave={() => {
                                                setRowHover(undefined);
                                            }}
                                            className={
                                                "absolute grid w-fit hover:bg-[#2e2f34] " +
                                                (row.index % 2 == 0
                                                    ? "bg-[#2e2e31]"
                                                    : "bg-[#28282b]")
                                            }
                                            style={{
                                                top:
                                                    row.index * rowHeight +
                                                    "px",
                                                height: rowHeight + "px",
                                                gridTemplateColumns: columns
                                                    ?.map(
                                                        (column) =>
                                                            column.width + "px"
                                                    )
                                                    .join(" "),
                                            }}
                                        >
                                            {Object.entries(row.row).map(
                                                (entry) => (
                                                    <Cell
                                                        key={
                                                            row.index + entry[0]
                                                        }
                                                        text={entry[1]}
                                                    />
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                    <div
                        className="flex w-full items-center bg-[#212225] px-1 text-sm"
                        style={{ gridArea: "footer" }}
                    >
                        <ChevronsLeft
                            onClick={() => {
                                scrollRef.current?.scrollTo(
                                    scrollRef.current?.scrollLeft,
                                    0
                                );
                            }}
                        />
                        <ChevronLeft
                            onClick={() => {
                                scrollRef.current?.scrollTo(
                                    scrollRef.current?.scrollLeft,
                                    (Math.floor(scroll / rowHeight / pageSize) -
                                        1) *
                                        rowHeight *
                                        pageSize
                                );
                            }}
                        />
                        <input
                            value={
                                Math.floor(scroll / rowHeight / pageSize) + 1
                            }
                            type="number"
                            onChange={(event) => {
                                scrollRef.current?.scrollTo(
                                    scrollRef.current?.scrollLeft,
                                    (Number(event.target.value) - 1) *
                                        rowHeight *
                                        pageSize
                                );
                            }}
                            className="w-16 p-1 text-xs outline-none"
                        />
                        <ChevronRight
                            onClick={() => {
                                scrollRef.current?.scrollTo(
                                    scrollRef.current?.scrollLeft,
                                    (Math.floor(scroll / rowHeight / pageSize) +
                                        1) *
                                        rowHeight *
                                        pageSize
                                );
                            }}
                        />
                        <ChevronsRight
                            onClick={() => {
                                scrollRef.current?.scrollTo(
                                    scrollRef.current?.scrollLeft,
                                    totalRows * rowHeight
                                );
                            }}
                        />
                    </div>
                </div>
            </div>
        </TableContext.Provider>
    );
}
