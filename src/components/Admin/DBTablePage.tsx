import type { Column } from "@/lib/db/db";
import { debounce, initial } from "lodash";
import pkg from "lodash";
import {
    ArrowDown,
    ArrowDownAZ,
    ArrowUp,
    ArrowUpAZ,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CircleAlert,
    Copy,
    Edit,
    Hash,
    KeySquare,
    Plus,
    RotateCw,
    SlidersHorizontal,
    Text,
    ToggleLeft,
    Trash2,
} from "lucide-react";
import {
    useEffect,
    useState,
    createContext,
    type Dispatch,
    type SetStateAction,
    useContext,
    useRef,
    type ReactElement,
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
    totalRows: number;
    data: any[] | undefined;
    setEditPopup: Dispatch<SetStateAction<number | undefined>>;
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
type RequestType = {
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
};

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

function BasePopup({
    title,
    handleInsert,
    handleCancel,
    handleUpdate,
    handlePrevious,
    handleNext,
    children,
}: {
    title: string;
    handleInsert?: () => void;
    handleUpdate?: () => void;
    handleCancel?: () => void;
    handlePrevious?: () => void;
    handleNext?: () => void;
    children?: ReactElement | boolean | (ReactElement | boolean | undefined)[];
}) {
    return (
        <div
            id="base-popup"
            style={{ boxShadow: "0px 0px 20px 4px #08080890" }}
            className="grid grid-rows-[min-content_1fr_min-content] aspect-[1.618/1] h-auto w-1/2 absolute bg-[#28282b] z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg overflow-hidden"
        >
            <div className="bg-[#212225] w-full px-5 font-semibold flex flex-row items-center gap-x-1 select-none">
                <label>{title}</label>
                {handlePrevious && (
                    <ArrowUp
                        onClick={handlePrevious}
                        className="w-4 h-4 cursor-pointer"
                    />
                )}
                {handleNext && (
                    <ArrowDown
                        onClick={handleNext}
                        className="w-4 h-4 cursor-pointer"
                    />
                )}
            </div>
            <div className="h-full min-h-0 max-h-full">{children}</div>
            <div
                className="bg-[#212225] w-full px-5 py-1 font-semibold flex flex-row items-center justify-between"
                style={{ boxShadow: "rgb(8 8 8 / 48%) 0px 0px 10px 4px" }}
            >
                {handleCancel && (
                    <button className="text-red-400" onClick={handleCancel}>
                        Cancel
                    </button>
                )}
                {handleInsert && <button onClick={handleInsert}>Insert</button>}
                {handleUpdate && <button onClick={handleUpdate}>Update</button>}
            </div>
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
        fetch("/api/admin/db", {
            method: "PUT",
            body: JSON.stringify({
                table: table,
                fields: fields,
                type: "INSERT",
            }),
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
        <BasePopup
            title="Insert new row"
            handleInsert={handleInsert}
            handleCancel={() => {
                setInsertPopOpen(false);
            }}
        >
            <div className="overflow-y-auto grid grid-cols-1 xl:grid-cols-2 h-full">
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
        </BasePopup>
    );
}

function EditPopup({ index }: { index: number }) {
    const {
        columns,
        data,
        offset,
        table,
        totalRows,
        maxRows,
        columnFilters,
        fetchDebounce,
        sortBy,
        sortAscending,
        setEditPopup,
    } = useContext(TableContext) as TableContextType;

    const [currentIndex, setCurrentIndex] = useState(index);

    const [fields, setFields] = useState<
        { [key: string]: string | undefined } | undefined | "Loading"
    >("Loading");

    const [initialFields, setInitialFields] = useState<
        { [key: string]: string | undefined } | undefined
    >();

    const [badVariable, setBadVariable] = useState<string>();
    const [badVariableMessage, setBadVariableMessage] = useState<string>();

    useEffect(() => {
        if (!data) return;

        const tempFields: { [key: string]: string | undefined } = {};

        let row = data[currentIndex - offset];

        if (!row) {
            const request: RequestType = {
                table: table,
                maxRows: 1,
                offset: currentIndex,
            };
            setFields("Loading");

            fetch("/api/admin/db", {
                method: "POST",
                body: JSON.stringify(request),
            }).then((response) => {
                if (response.ok) {
                    response.json().then((data) => {
                        columns?.forEach(
                            (column) =>
                                (tempFields[column.name] =
                                    data.data[0][column.name])
                        );
                        setFields({ ...tempFields });
                        setInitialFields({ ...tempFields });
                    });
                } else {
                    setFields(undefined);
                }
            });
        } else {
            columns?.forEach(
                (column) => (tempFields[column.name] = row.row[column.name])
            );
            setFields({ ...tempFields });
            setInitialFields({ ...tempFields });
        }
    }, [currentIndex]);

    const handleUpdate = () => {
        const primaryKey = columns?.find((column) => column.key);
        if (!primaryKey) {
            // Tell user primaryKey couldn't be found.
            return;
        }

        if (!fields || fields == "Loading") return;
        if (!initialFields) return;

        const primaryKeyValue = fields[primaryKey.name];

        if (typeof primaryKeyValue != "string") return;

        const editedColumns: {
            column: string;
            newValue: string | undefined;
        }[] = [];

        columns?.forEach((column) => {
            if (fields[column.name] != initialFields[column.name]) {
                editedColumns.push({
                    column: column.name,
                    newValue: fields[column.name],
                });
            }
        });

        const updateRequest = {
            primaryKey: {
                column: primaryKey.name,
                value: primaryKeyValue,
            },
            editedColumns: editedColumns,
        };

        fetch("/api/admin/db", {
            method: "PUT",
            body: JSON.stringify({
                table: table,
                data: updateRequest,
                type: "UPDATE",
            }),
        }).then((response) => {
            if (response.ok) {
                setEditPopup(undefined);
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

    if (!data) return;

    return (
        <BasePopup
            title={`Edit ${table} ${currentIndex + 1}`}
            handlePrevious={() => {
                setCurrentIndex((value) => Math.max(value - 1, 0));
            }}
            handleNext={() => {
                setCurrentIndex((value) => Math.min(value + 1, totalRows));
            }}
            handleCancel={() => {}}
            handleUpdate={handleUpdate}
        >
            {fields == "Loading" && <label>Loading</label>}
            {fields == undefined && <label>Error Loading</label>}
            {fields && fields != "Loading" && (
                <div className="overflow-y-auto grid grid-cols-1 xl:grid-cols-2 h-full">
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
                                <label className="font-bold">
                                    {column.name}
                                </label>
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

                                {fields?.[column.name] !=
                                    initialFields?.[column.name] && (
                                    <label
                                        className="text-yellow-700 font-bold"
                                        title="Modified"
                                    >
                                        M
                                    </label>
                                )}
                            </div>
                            <textarea
                                className="bg-[#2e2f34] outline-none p-1"
                                value={fields?.[column.name] ?? ""}
                                onChange={(e) => {
                                    setFields((value) => {
                                        if (!value || value == "Loading")
                                            return {};
                                        value[column.name] = e.target.value;

                                        return { ...value };
                                    });
                                }}
                            ></textarea>
                        </div>
                    ))}
                </div>
            )}
        </BasePopup>
    );
}

function Cell({ text }: { text: unknown }) {
    const [hover, setHover] = useState(false);

    return (
        <div
            className="min-w-0 max-w-full w-full grid grid-cols-[1fr_min-content] items-center"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => {
                setHover(false);
            }}
        >
            {typeof text == "string" ||
            typeof text == "number" ||
            typeof text == "undefined" ? (
                <label className="min-w-0 max-w-full w-full block truncate px-1 text-sm text-neutral-300">
                    {text}
                </label>
            ) : (
                <label className="min-w-0 max-w-full w-full block truncate px-1 text-sm text-neutral-500">
                    NULL
                </label>
            )}

            {hover && (
                <Copy
                    className="w-4 h-4 cursor-pointer"
                    onClick={() => {
                        navigator.clipboard.writeText(
                            text?.toString() ?? "Unable to copy data"
                        );
                    }}
                />
            )}
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
    const [editPopup, setEditPopup] = useState<number | undefined>(undefined);

    const fetchDebounce = useRef<DebounceFetchType>();

    const [rowHover, setRowHover] = useState();

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
                };

                fetch("/api/admin/db", {
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
            }}
        >
            <div
                className="w-full h-full relative"
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
                        "w-full h-full grid grid-rows-[min-content_1fr_min-content] " +
                        (insertPopupOpen ||
                            (editPopup &&
                                "opacity-50 pointer-events-none select-none"))
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
                                            className="text-right px-1 text-sm text-neutral-300 absolute w-full grid grid-cols-[1fr_min-content]"
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
                                            <div className=" flex flex-row gap-x-1">
                                                {row.index == rowHover && (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                                {row.index == rowHover && (
                                                    <Edit
                                                        onClick={() => {
                                                            setEditPopup(
                                                                row.index
                                                            );
                                                        }}
                                                        className="h-4 w-4"
                                                    />
                                                )}
                                            </div>
                                            <label>{row.index + 1}</label>
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
                                            onMouseEnter={() => {
                                                setRowHover(row.index);
                                            }}
                                            onMouseLeave={() => {
                                                setRowHover(undefined);
                                            }}
                                            className={
                                                "w-fit grid hover:bg-[#2e2f34] absolute " +
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
