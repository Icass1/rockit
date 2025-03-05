import { useContext, useEffect, useState } from "react";
import { TableContext } from "./tableContext";
import type { TableContextType } from "./types";
import { BasePopup } from "./BasePopup";
import { Hash, KeySquare, Text, ToggleLeft } from "lucide-react";

export function InsertPopup() {
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
