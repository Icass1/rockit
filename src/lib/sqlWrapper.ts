import { Database } from "better-sqlite3";
import sqlite from "better-sqlite3";
import { writeFileSync } from "fs";
import { getDatabaseDate } from "./getTime";

function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

interface ColumnOptions {
    type: "INTEGER" | "TEXT" | "DATE" | "BOOLEAN" | "sqlWrapper-now-func";
    primaryKey?: boolean;
    unique?: boolean;
    notNull?: boolean;
    default?: true | false | null | string | number;
    checkIn?: string[];
}
class ColumnInit {
    table: TableInit;
    columnName: string;
    options: ColumnOptions;
    reference: ColumnInit | undefined;
    referenceAccessName: string | undefined;

    constructor(columnName: string, table: TableInit, options: ColumnOptions) {
        this.table = table;
        this.columnName = columnName;
        this.options = options;
    }

    setReference(column: ColumnInit, accessName: string) {
        if (
            this.table.columns.find(
                (_column) =>
                    _column.referenceAccessName == accessName ||
                    _column.columnName == accessName
            )
        )
            throw `Conflicting accessName '${accessName}' while adding reference.`;

        this.reference = column;
        this.referenceAccessName = accessName;

        column.table.addForeginKey(this, column);

        return this;
    }

    getQuery() {
        const tokens: string[] = [];

        tokens.push(this.columnName);
        if (this.options.type == "sqlWrapper-now-func") {
            tokens.push("DATE");
        } else {
            tokens.push(this.options.type);
        }

        if (this.options.notNull) {
            tokens.push("NOT NULL");
        }

        if (typeof this.options.default != "undefined") {
            if (this.options.default == false) {
                tokens.push("DEFAULT FALSE");
            } else if (typeof this.options.default == "string") {
                tokens.push(`DEFAULT "${this.options.default}"`);
            } else if (typeof this.options.default == "number") {
                tokens.push(`DEFAULT ${this.options.default}`);
            } else {
                throw `Unknown default type '${this.options.default}' for ${this.table.tableName}.${this.columnName}`;
            }
        }

        if (this.options.checkIn) {
            tokens.push(
                `CHECK (${this.columnName} IN ('${this.options.checkIn.join("', '")}'))`
            );
        }

        if (this.options.unique) {
            tokens.push("UNIQUE");
        }
        return tokens.join(" ");
    }
    getReferences(): string | undefined {
        if (!this.reference) return;

        return `FOREIGN KEY (${this.columnName}) REFERENCES ${this.reference.table.tableName}(${this.reference.columnName})`;
    }
    getType() {
        let variableType: string;

        if (this.options.type == "DATE") {
            variableType = "string";
        } else if (this.options.type == "INTEGER") {
            variableType = "number";
        } else if (this.options.type == "TEXT") {
            variableType = "string";
        } else if (this.options.type == "BOOLEAN") {
            variableType = "boolean";
        } else if (this.options.type == "sqlWrapper-now-func") {
            variableType = "string";
        } else {
            throw `Unknown varialbe type ${this.options.type}`;
        }

        return variableType;
    }

    getTypeLine() {
        return `    ${this.columnName}${this.options.notNull && this.options.type != "sqlWrapper-now-func" ? "" : "?"}: ${this.getType()};`;
    }
}

export class TableInit {
    tableName: string;
    columns: ColumnInit[] = [];
    db: DB;
    typesName: string;
    rowClassName: string;
    primaryKeys: ColumnInit[] = [];

    foreginKeys: { foreginColumn: ColumnInit; column: ColumnInit }[] = [];

    constructor(db: DB, tableName: string) {
        this.tableName = tableName;
        this.db = db;

        this.typesName = capitalizeFirstLetter(this.tableName) + "Type";
        this.rowClassName = capitalizeFirstLetter(this.tableName) + "Row";
    }

    addColumn(columnName: string, options: ColumnOptions) {
        if (options.primaryKey) options.notNull = true;

        if (this.columns.find((_column) => _column.columnName == columnName))
            throw `Two columns with same name '${columnName}'`;

        const column = new ColumnInit(columnName, this, options);
        this.columns.push(column);

        if (options.primaryKey && this.primaryKeys.indexOf(column) == -1) {
            this.primaryKeys.push(column);
        }

        return column;
    }

    setPrimaryKeys(columns: ColumnInit[]) {
        columns.forEach((column) => {
            if (this.columns.indexOf(column) == -1)
                throw `Column ${column.columnName} is not of this ${this.tableName} table. It is in ${column.table.tableName}`;
            if (this.primaryKeys.indexOf(column) - 1) {
                this.primaryKeys.push(column);
                column.options.notNull = true;
            }
        });
    }

    addForeginKey(foreginColumn: ColumnInit, column: ColumnInit) {
        this.foreginKeys.push({ foreginColumn: foreginColumn, column: column });
    }

    getQuery() {
        const query: string[] = [];

        this.columns.forEach((column) => query.push(column.getQuery()));
        this.columns.forEach((column) => {
            const references = column.getReferences();
            if (references) {
                query.push(references);
            }
        });

        if (this.primaryKeys.length > 0) {
            query.push(
                `PRIMARY KEY (${this.primaryKeys.map((column) => column.columnName).join(",")})`
            );
        }

        return (
            `CREATE TABLE IF NOT EXISTS ${this.tableName} (\n` +
            query.join(",\n") +
            "\n)"
        );
    }

    getTypes() {
        const lines: string[] = [];

        lines.push(`interface ${this.typesName} {`);

        this.columns.forEach((column) => lines.push(column.getTypeLine()));

        lines.push("}");

        return lines;
    }

    getClassDefinition() {
        const lines = [];

        lines.push(...this.getTypes());

        lines.push(`class ${this.rowClassName} {`);
        lines.push("    private columnName: string");
        lines.push("    private value: string | number | null");
        lines.push("    private db: DB");
        lines.push(
            "    constructor(columnName: string, value: string | number | null, db: DB) {"
        );
        lines.push("        this.columnName = columnName");
        lines.push("        this.value = value");
        lines.push("        this.db = db");
        lines.push("    }");

        this.columns.forEach((column) => {
            lines.push(
                `    get ${column.columnName}(): ${column.getType()}${column.options.notNull ? "" : " | undefined"} {`
            );
            lines.push(
                "        return (this.db.db.prepare(" +
                    "`" +
                    `SELECT ${column.columnName} FROM ${this.tableName} WHERE ` +
                    "${this.columnName} = ?`).get(this.value) as " +
                    `${this.typesName})` +
                    `.${column.columnName} as ${column.getType()}${column.options.notNull ? "" : " | undefined"}`
            );

            lines.push(`    }`);
            lines.push(
                `    set ${column.columnName}(newValue: ${column.getType()}${column.options.notNull ? "" : " | undefined"}) {`
            );
            lines.push(
                `        console.warn("TODO", newValue, this.columnName, this.value)`
            );
            lines.push(`    }`);
        });

        lines.push("    // *********************");

        this.columns.forEach((column) => {
            if (column.reference && column.referenceAccessName) {
                lines.push(
                    `    get ${column.referenceAccessName}(): ${column.reference.table.rowClassName}${column.options.notNull ? "" : " | undefined"} {`
                );
                lines.push(
                    (column.options.notNull
                        ? "        "
                        : `        if (this.${column.columnName}) `) +
                        `return new ${column.reference.table.rowClassName}("${column.reference.columnName}", this.${column.columnName}, this.db)`
                );
                lines.push(`    }`);
            }
        });
        lines.push("    // *********************");

        this.foreginKeys.forEach((foreginKey) => {
            lines.push(
                `    get ${foreginKey.foreginColumn.table.tableName}() {`
            );
            lines.push(
                `        const a ` +
                    " = this.db.db.prepare(`SELECT " +
                    `${foreginKey.foreginColumn.table.primaryKeys[0].columnName} FROM ${foreginKey.foreginColumn.table.tableName} WHERE ${foreginKey.foreginColumn.columnName} = ?` +
                    "`)" +
                    `.all(this.${foreginKey.column.columnName}) as {${foreginKey.foreginColumn.table.primaryKeys[0].columnName}: ${foreginKey.foreginColumn.table.primaryKeys[0].getType()}}[]`
            );
            lines.push(
                `        return a.map(b => new ${foreginKey.foreginColumn.table.rowClassName}("${foreginKey.foreginColumn.table.primaryKeys[0].columnName}", b.${foreginKey.foreginColumn.table.primaryKeys[0].columnName}, this.db))`
            );
            lines.push(`    }`);
        });

        lines.push("}");

        lines.push(
            `class ${capitalizeFirstLetter(this.tableName)} extends BaseTable<${this.typesName}> {`
        );
        lines.push("    db: DB");
        lines.push("    constructor(db: DB) {");
        lines.push(
            `        super("${this.tableName}", db, [${this.columns
                .map((column) => {
                    if (column.options.type == "sqlWrapper-now-func")
                        return `{
                            columnName: '${column.columnName}',
                            type: '${column.options.type}',
                        }`;
                })
                .filter((columnInfo) => columnInfo)}])`
        );
        lines.push("        this.db = db");
        lines.push("    }");
        lines.push(
            `    get(columnName: string, value: string | number | null): ${this.rowClassName} {`
        );
        lines.push(
            `        return new ${this.rowClassName}(columnName, value, this.db)`
        );
        lines.push("    }");
        lines.push("}");

        lines.push(
            `export const ${this.tableName} = new ${capitalizeFirstLetter(this.tableName)}(db);`
        );

        lines.push("");
        lines.push("");
        lines.push("");

        return lines;
    }

    // get(column: string, value: string | number | null): Row<T> {
    //     return new Row<T>(this, column, value);
    // }

    commit() {
        this.db.db.exec(this.getQuery());
    }
}

interface InsertOptions {
    ignoreIfExists?: boolean;
}

export class BaseTable<T> {
    tableName: string;
    db: DB;
    columnsInfo: { columnName: string; type: string }[] = [];

    constructor(
        tableName: string,
        db: DB,
        columnsInfo: { columnName: string; type: string }[]
    ) {
        this.tableName = tableName;
        this.db = db;
        this.columnsInfo = columnsInfo;
    }

    insert(object: T[], options?: InsertOptions): void;
    insert(object: T, options?: InsertOptions): void;
    insert(object: T | T[], options?: InsertOptions) {
        if (typeof object != "object") throw "Input object is not an object";
        if (!object) throw "Input object is not defined";

        if (Array.isArray(object)) {
            object.forEach((_object) => {
                if (typeof _object != "object")
                    throw "Input object is not an object";
                if (!_object) throw "Input object is not defined";

                this.columnsInfo.forEach((columnInfo) => {
                    if (
                        columnInfo.type === "sqlWrapper-now-func" &&
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        !(_object as any)[columnInfo.columnName]
                    ) {
                        console.log("Setting", columnInfo.columnName);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (_object as any)[columnInfo.columnName] =
                            getDatabaseDate();
                    }
                });

                const queryString = `INSERT INTO ${this.tableName} (${Object.keys(_object).join(",")}) VALUES (${Object.keys(
                    _object
                )
                    .map(() => "?")

                    .join(", ")})`;

                const query = this.db.db.prepare(queryString);
                try {
                    query.run(...Object.values(_object));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error: any) {
                    if (
                        options?.ignoreIfExists &&
                        error.toString().includes("UNIQUE constraint failed")
                    ) {
                    } else {
                        throw error;
                    }
                }
            });
        } else {
            this.columnsInfo.forEach((columnInfo) => {
                if (
                    columnInfo.type === "sqlWrapper-now-func" &&
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    !(object as any)[columnInfo.columnName]
                ) {
                    console.log("Setting", columnInfo.columnName);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (object as any)[columnInfo.columnName] = getDatabaseDate();
                }
            });

            const queryString = `INSERT INTO ${this.tableName} (${Object.keys(object).join(",")}) VALUES (${Object.keys(
                object
            )
                .map(() => "?")
                .join(", ")})`;

            const query = this.db.db.prepare(queryString);
            try {
                query.run(...Object.values(object));
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                if (
                    options?.ignoreIfExists &&
                    error.toString().includes("UNIQUE constraint failed")
                ) {
                } else {
                    throw error;
                }
            }
        }
    }
}

export class DB {
    db: Database;
    tables: TableInit[] = [];

    dbFile: string;

    NOW = "sqlWrapper-now-func" as const;

    constructor(dbFile: string) {
        this.db = sqlite(dbFile);
        this.dbFile = dbFile;
    }
    addTable(tableName: string) {
        const table = new TableInit(this, tableName);
        this.tables.push(table);
        return table;
    }
    commit(outputFile: string) {
        this.tables.forEach((table) => table.commit());

        const lines: string[] = [];
        lines.push("// **********************************************");
        lines.push("// **** File managed by sqlWrapper by RockIt ****");
        lines.push("// ***********^**********************************");
        lines.push("");
        lines.push('import { DB, BaseTable } from "@/lib/sqlWrapper";');
        lines.push("");
        lines.push(`export const db = new DB("${this.dbFile}");`);

        this.tables.map((table) => lines.push(...table.getClassDefinition()));

        writeFileSync(outputFile, lines.join("\n"));
    }
}
