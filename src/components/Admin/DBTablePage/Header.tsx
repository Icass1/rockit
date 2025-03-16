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
                gridArea: "header",
                gridTemplateColumns: columns
                    ?.map((column) => column.width + "px")
                    .join(" "),
            }}
            className="grid h-full bg-[#212225] w-fit sticky top-0 z-10 "
        >
            {columns?.map((column) => (
                <div
                    key={column.name}
                    className="min-w-0 max-w-full w-full flex flex-col px-1 gap-y-1 py-1 border border-l-0 border-solid border-[#373838]"
                >
                    <div
                        className="flex flex-row justify-between items-center"
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
                                <ArrowUpAZ className="w-4 h-4" />
                            )}
                            {sortBy == column.name &&
                                sortAscending == false && (
                                    <ArrowDownAZ className="w-4 h-4" />
                                )}
                            {column.key && (
                                <KeySquare className="w-4 h-4 text-orange-400" />
                            )}
                            {column.type == "TEXT" && (
                                <div title="TEXT">
                                    <Text className="w-4 h-4" />
                                </div>
                            )}
                            {column.type == "INTEGER" && (
                                <div title="INTEGER">
                                    <Hash className="w-4 h-4" />
                                </div>
                            )}
                            {column.type == "BOOLEAN" && (
                                <div title="BOOLEAN">
                                    <ToggleLeft className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-row bg-[#2e2f34] items-center px-1 gap-x-1">
                        <input
                            type="search"
                            placeholder="Filter..."
                            className="text-sm py-[1px] bg-transparent rounded outline-0 w-full"
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
                            className="w-5 h-5"
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
                                    "block w-full h-full " +
                                    (columnFilters &&
                                    columnFilters[column.name].exact
                                        ? " text-blue-500 "
                                        : "")
                                }
                            />
                        </div>
                        <div
                            title="Invert"
                            className="w-5 h-5"
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
                                    "block w-full h-full " +
                                    (columnFilters &&
                                    columnFilters[column.name].invert
                                        ? " text-blue-500 "
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
