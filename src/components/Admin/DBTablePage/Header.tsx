"use client";

import { useContext } from "react";
import { TableContext } from "./tableContext";
import type { TableContextType } from "./types";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    CircleAlert,
    Hash,
    KeySquare,
    SlidersHorizontal,
    Text,
    ToggleLeft,
} from "lucide-react";

export function Header() {
    const {
        setSortBy,
        columns,
        sortBy,
        sortAscending,
        setSortAscending,
        columnFilters,
        setColumnFilters,
    } = useContext(TableContext) as TableContextType;

    return (
        <div
            style={{
                gridArea: "main-header",
                gridTemplateColumns: columns
                    ?.map((column) => column.width + "px")
                    .join(" "),
            }}
            className="sticky top-0 z-10 grid h-full w-fit bg-[#212225]"
        >
            {columns?.map((column) => (
                <div
                    key={column.name}
                    className="flex w-full max-w-full min-w-0 flex-col gap-y-1 border border-l-0 border-solid border-[#373838] px-1 py-1"
                >
                    <div
                        className="flex flex-row items-center justify-between"
                        onClick={() => {
                            if (sortBy == column.name) {
                                if (sortAscending) {
                                    setSortAscending(false);
                                } else {
                                    setSortBy(undefined);
                                }
                            } else {
                                setSortBy(column.name);
                                setSortAscending(true);
                            }
                        }}
                    >
                        <label className="truncate text-sm">
                            {column.name}
                        </label>
                        <div className="flex flex-row gap-x-1">
                            {sortBy == column.name && sortAscending == true && (
                                <ArrowUpAZ className="h-4 w-4" />
                            )}
                            {sortBy == column.name &&
                                sortAscending == false && (
                                    <ArrowDownAZ className="h-4 w-4" />
                                )}
                            {column.key && (
                                <KeySquare className="h-4 w-4 text-orange-400" />
                            )}
                            {column.type == "TEXT" && (
                                <div title="TEXT">
                                    <Text className="h-4 w-4" />
                                </div>
                            )}
                            {column.type == "INTEGER" && (
                                <div title="INTEGER">
                                    <Hash className="h-4 w-4" />
                                </div>
                            )}
                            {column.type == "BOOLEAN" && (
                                <div title="BOOLEAN">
                                    <ToggleLeft className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-row items-center gap-x-1 bg-[#2e2f34] px-1">
                        <input
                            type="search"
                            placeholder="Filter..."
                            className="w-full rounded bg-transparent py-[1px] text-sm outline-0"
                            value={
                                columnFilters
                                    ? columnFilters[column.name].text
                                    : "Error"
                            }
                            onChange={(e) => {
                                setColumnFilters((value) => {
                                    if (!value) {
                                        value = {};
                                    }
                                    value[column.name].text = e.target.value;
                                    return { ...value };
                                });
                            }}
                        />
                        <div
                            title="Exact"
                            className="h-5 w-5"
                            onClick={() => {
                                setColumnFilters((value) => {
                                    if (!value) {
                                        value = {};
                                    }
                                    value[column.name].exact =
                                        !value[column.name].exact;
                                    return { ...value };
                                });
                            }}
                        >
                            <SlidersHorizontal
                                className={
                                    "block h-full w-full " +
                                    (columnFilters &&
                                    columnFilters[column.name].exact
                                        ? " text-blue-500"
                                        : "")
                                }
                            />
                        </div>
                        <div
                            title="Invert"
                            className="h-5 w-5"
                            onClick={() => {
                                setColumnFilters((value) => {
                                    if (!value) {
                                        value = {};
                                    }
                                    value[column.name].invert =
                                        !value[column.name].invert;
                                    return { ...value };
                                });
                            }}
                        >
                            <CircleAlert
                                className={
                                    "block h-full w-full " +
                                    (columnFilters &&
                                    columnFilters[column.name].invert
                                        ? " text-blue-500"
                                        : "")
                                }
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
