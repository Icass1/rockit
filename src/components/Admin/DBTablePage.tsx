import type { Column } from "@/lib/db/db";
import { debounce } from "lodash";
import pkg from "lodash";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CircleAlert,
    Hash,
    KeySquare,
    Plus,
    RotateCw,
    SlidersHorizontal,
    Text,
    ToggleLeft,
} from "lucide-react";
import {
    useEffect,
    useState,
    createContext,
    type Dispatch,
    type SetStateAction,
    useContext,
    useRef,
} from "react";

type ColumnFiltersType = {
    [key: string]: { text: string; invert: boolean; exact: boolean };
};
type ColumnType = {
    name: string;
    width: number;
    key: boolean;
    type: string;
};

type TableContextType = {
    table: string;
    setSortBy: Dispatch<SetStateAction<string | undefined>>;
    columns: ColumnType[] | undefined;
    sortBy: string | undefined;
    sortAscending: boolean;
    setSortAscending: Dispatch<SetStateAction<boolean>>;
    setInsertPopOpen: Dispatch<SetStateAction<boolean>>;
    fetchDebounce: React.MutableRefObject<DebounceFetchType | undefined>;
    maxRows: number;
    offset: number;
    columnFilters:
        | {
              [key: string]: {
                  text: string;
                  invert: boolean;
                  exact: boolean;
              };
          }
        | undefined;
    setColumnFilters: Dispatch<
        SetStateAction<
            | {
                  [key: string]: {
                      text: string;
                      invert: boolean;
                      exact: boolean;
                  };
              }
            | undefined
        >
    >;
};

type DebounceFetchType = pkg.DebouncedFunc<
    (
        maxRows: number,
        columnFilters: ColumnFiltersType | undefined,
        offset: number,
        sortBy: string | undefined,
        sortAscending: boolean
    ) => void
>;

const TableContext = createContext<TableContextType | undefined>(undefined);

function Header() {
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
function InsertPopup() {
    const {
        columns,
        table,
        setInsertPopOpen,
        fetchDebounce,
        maxRows,
        columnFilters,
        offset,
        sortBy,
        sortAscending,
    } = useContext(TableContext) as TableContextType;

    const [fields, setFields] = useState<
        { [key: string]: string | undefined } | undefined
    >(undefined);

    const [badVariable, setBadVariable] = useState<string>();
    const [badVariableMessage, setBadVariableMessage] = useState<string>();

    useEffect(() => {
        const tempFields: { [key: string]: string | undefined } = {};

        columns?.forEach((column) => (tempFields[column.name] = undefined));
        setFields(tempFields);
    }, []);

    const handleInsert = () => {
        fetch("/api/db", {
            method: "PUT",
            body: JSON.stringify({ table: table, fields: fields }),
        }).then((response) => {
            if (response.ok) {
                setInsertPopOpen(false);
                if (fetchDebounce.current)
                    fetchDebounce.current(
                        maxRows,
                        columnFilters,
                        offset,
                        sortBy,
                        sortAscending
                    );
            } else {
                response.text().then((data) => {
                    console.log(data);
                    if (
                        data.includes(
                            "SqliteError: NOT NULL constraint failed: "
                        )
                    ) {
                        setBadVariableMessage("NOT NULL constraint failed");
                        setBadVariable(data.split(`${table}.`)[1]);
                    } else if (
                        data.includes("SqliteError: UNIQUE constraint failed: ")
                    ) {
                        setBadVariableMessage("UNIQUE constraint failed");
                        setBadVariable(data.split(`${table}.`)[1]);
                    }
                });
            }
        });
    };

    return (
        <div
            id="insert-popup"
            style={{ boxShadow: "0px 0px 20px 4px #08080890" }}
            className="flex flex-col aspect-[1.618/1] w-1/2 absolute bg-[#28282b] z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg overflow-hidden"
        >
            <div className="bg-[#212225] w-full px-5 font-semibold">
                <label>Insert new row</label>
            </div>
            <div className="overflow-y-auto">
                {columns?.map((column) => (
                    <div
                        key={column.name}
                        className={
                            "p-3 flex flex-col " +
                            (column.name == badVariable
                                ? " bg-red-400/20 md:hover:bg-red-400/30 "
                                : " md:hover:bg-[#2a2a2e] ")
                        }
                    >
                        <div className="flex flex-row items-center gap-x-2">
                            <label className="font-bold">{column.name}</label>
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
                            {column.name == badVariable && (
                                <label className="text-sm text-red-400">
                                    {badVariableMessage}
                                </label>
                            )}
                        </div>
                        <textarea
                            className="bg-[#2e2f34] outline-none p-1"
                            value={fields?.[column.name] ?? ""}
                            onChange={(e) => {
                                setFields((value) => {
                                    if (!value) return {};
                                    value[column.name] = e.target.value;

                                    return { ...value };
                                });
                            }}
                        ></textarea>
                    </div>
                ))}
            </div>
            <div
                className="bg-[#212225] w-full px-5 py-1 font-semibold flex flex-row items-center justify-between"
                style={{ boxShadow: "rgb(8 8 8 / 48%) 0px 0px 10px 4px" }}
            >
                <button className="text-red-400">Cancel</button>
                <button onClick={handleInsert}>Insert</button>
            </div>
        </div>
    );
}

export default function DBTablePage({ table }: { table: string }) {
    const [data, setData] = useState<any[] | undefined>();
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

    const fetchDebounce = useRef<DebounceFetchType>();

    useEffect(() => {
        fetchDebounce.current = debounce(
            (
                maxRows: number,
                columnFilters: ColumnFiltersType,
                offset: number,
                sortBy: string,
                sortAscending: boolean
            ) => {
                const request: {
                    table: string;
                    maxRows: number;
                    offset?: number;
                    sortColumn?: string;
                    ascending?: boolean;
                    columns?: string[];
                    filter?: {
                        column: string;
                        text: string;
                        invert: boolean;
                        exact: boolean;
                    }[];
                } = {
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
                };

                fetch("/api/db", {
                    method: "POST",
                    body: JSON.stringify(request),
                }).then((response) => {
                    if (response.ok) {
                        response.json().then((data) => {
                            setData(
                                data.data.map((row: any, index: number) => {
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
    }, []);

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

    return (
        <TableContext.Provider
            value={{
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
            }}
        >
            <div
                className="w-full h-full relative"
                onClick={(e) => {
                    if (
                        document
                            .querySelector("#insert-popup")
                            ?.contains(e.target as Node)
                    )
                        return;
                    if (insertPopupOpen) setInsertPopOpen(false);
                }}
            >
                {insertPopupOpen && <InsertPopup />}
                <div
                    className={
                        "w-full h-full grid grid-rows-[min-content_1fr_min-content] " +
                        (insertPopupOpen &&
                            "opacity-50 pointer-events-none select-none")
                    }
                >
                    <div className="h-6 w-full bg-[#212225] px-1 text-sm items-center flex flex-row gap-x-2">
                        <RotateCw
                            className="w-4 h-4 cursor-pointer"
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
                        className="w-full h-full grid grid-rows-[min-content_1fr] grid-cols-[70px_1fr] overflow-auto scroll-smooth bg-[#28282b]"
                        style={{
                            gridTemplateAreas: ' "corner header" "left main"',
                        }}
                        onScroll={(e) => {
                            setScroll(e.currentTarget.scrollTop);
                        }}
                        ref={scrollRef}
                    >
                        <Header />
                        <div
                            style={{ gridArea: "corner" }}
                            className="bg-[#212225] sticky left-0 top-0 z-20 border-r border-b border-t border-solid border-[#373838]"
                        />

                        <div
                            style={{ gridArea: "left" }}
                            className="bg-[#212225] sticky left-0 z-10 border-r border-solid border-[#373838]"
                        >
                            {data &&
                                data.map((row) => {
                                    return (
                                        <div
                                            key={row.index}
                                            className="text-right px-1 text-sm text-neutral-300 absolute w-full "
                                            style={{
                                                height: rowHeight + "px",
                                                top:
                                                    row.index * rowHeight +
                                                    "px",
                                            }}
                                        >
                                            {row.index + 1}
                                        </div>
                                    );
                                })}
                        </div>
                        <div
                            className="flex flex-row justify-between items-center sticky bottom-0 left-0 w-full bg-[#212225] z-10 p-[1px] px-1 text-right border-r border-t border-solid border-[#373838]"
                            style={{
                                top: 0 + "px",
                            }}
                        >
                            <Plus
                                className="w-4 h-4 hover:scale-105 cursor-pointer"
                                onClick={() => {
                                    setInsertPopOpen(true);
                                }}
                            ></Plus>
                            <label className="text-neutral-500 text-sm">
                                {totalRows + 1}
                            </label>
                        </div>

                        <div
                            className="w-full h-full relative"
                            style={{ gridArea: "main" }}
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
                                            className={
                                                "w-fit grid py-[2px] hover:bg-[#2e2f34] absolute " +
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
                                                (entry) => {
                                                    return (
                                                        <label
                                                            key={
                                                                row.index +
                                                                entry[0]
                                                            }
                                                            className="min-w-0 max-w-full w-full truncate px-1 text-sm text-neutral-300"
                                                        >
                                                            {typeof entry[1] ==
                                                                "string" ||
                                                            typeof entry[1] ==
                                                                "number" ||
                                                            typeof entry[1] ==
                                                                "undefined"
                                                                ? entry[1]
                                                                : "NULL"}
                                                        </label>
                                                    );
                                                }
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                    <div className="w-full bg-[#212225] px-1 text-sm items-center flex">
                        <ChevronsLeft
                            onClick={() => {
                                scrollRef.current?.scrollTo(0, 0);
                            }}
                        />
                        <ChevronLeft
                            onClick={() => {
                                scrollRef.current?.scrollTo(
                                    0,
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
                                    0,
                                    (Number(event.target.value) - 1) *
                                        rowHeight *
                                        pageSize
                                );
                            }}
                            className="w-16 outline-none text-xs p-1"
                        />
                        <ChevronRight
                            onClick={() => {
                                scrollRef.current?.scrollTo(
                                    0,
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
                                    0,
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
