"use client";

import { useContext, useEffect, useState } from "react";
import { TableContext } from "./tableContext";
import type { RequestType, Row, TableContextType } from "./types";
import { BasePopup } from "./BasePopup";
import { Hash, KeySquare, Text, ToggleLeft } from "lucide-react";

export function EditPopup({ index }: { index: number }) {
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
        dbFile,
    } = useContext(TableContext) as TableContextType;

    const [currentIndex, setCurrentIndex] = useState(index);

    const [fields, setFields] = useState<
        { [key: string]: string | number | undefined } | undefined | "Loading"
    >("Loading");

    const [initialFields, setInitialFields] = useState<
        { [key: string]: string | number | undefined } | undefined
    >();

    const [badVariable, setBadVariable] = useState<string>();
    const [badVariableMessage, setBadVariableMessage] = useState<string>();

    useEffect(() => {
        if (!data) return;

        const tempFields: { [key: string]: string | number | undefined } = {};

        const row = data[currentIndex - offset] as Row;

        if (!row) {
            const request: RequestType = {
                table: table,
                maxRows: 1,
                offset: currentIndex,
                dbFile,
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
    }, [currentIndex, columns, data, offset, table, dbFile]);

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
            newValue: string | number | undefined;
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
                <div className="grid h-full grid-cols-1 overflow-y-auto xl:grid-cols-2">
                    {columns?.map((column) => (
                        <div
                            key={column.name}
                            className={
                                "flex flex-col p-3 " +
                                (column.name == badVariable
                                    ? " bg-red-400/20 md:hover:bg-red-400/30"
                                    : " md:hover:bg-[#2a2a2e]")
                            }
                        >
                            <div className="flex flex-row items-center gap-x-2">
                                <label className="font-bold">
                                    {column.name}
                                </label>
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
                                {column.name == badVariable && (
                                    <label className="text-sm text-red-400">
                                        {badVariableMessage}
                                    </label>
                                )}

                                {fields?.[column.name] !=
                                    initialFields?.[column.name] && (
                                    <label
                                        className="font-bold text-yellow-700"
                                        title="Modified"
                                    >
                                        M
                                    </label>
                                )}
                            </div>
                            <textarea
                                className="bg-[#2e2f34] p-1 outline-none"
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
