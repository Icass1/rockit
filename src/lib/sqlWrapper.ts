import { Database } from "better-sqlite3";
import sqlite from "better-sqlite3";
import { writeFileSync } from "fs";
import { getDatabaseDate } from "./getTime";

function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function snakeCaseToCamelCase(val: string) {
    return capitalizeFirstLetter(
        val
            .toLowerCase()
            .replace(/([-_][a-z])/g, (group) =>
                group.toUpperCase().replace("-", "").replace("_", "")
            )
    );
}

function singularizeName(val: string) {
    if (val.at(-1) == "s" || val.at(-1) == "S") {
        return val.slice(0, -1);
    }
    return val;
}

interface TableInitOptions {
    associationTable?: boolean;
}

interface ColumnOptions {
    type: "INTEGER" | "TEXT" | "DATE" | "BOOLEAN";

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

        tokens.push(this.options.type);

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
        } else if (this.options.type == "sqlWrapper-date-on-update-func") {
            variableType = "string";
        } else {
            throw `1. Unknown variable type ${this.options.type}`;
        }

        return variableType;
    }

    getPythonRawType() {
        let variableType: string;

        if (this.options.type == "DATE") {
            variableType = "str";
        } else if (this.options.type == "INTEGER") {
            variableType = "float";
        } else if (this.options.type == "TEXT") {
            variableType = "str";
        } else if (this.options.type == "BOOLEAN") {
            variableType = "str";
        } else {
            throw `3. Unknown variable type ${this.options.type}`;
        }

        return variableType;
    }

    getSqlAlchemyType() {
        let variableType: string;
        if (this.options.type == "TEXT") {
            variableType = "String";
        } else if (this.options.type == "INTEGER") {
            variableType = "Integer";
        } else if (this.options.type == "DATE") {
            variableType = "DateTime";
        } else if (this.options.type == "BOOLEAN") {
            variableType = "Boolean";
        } else {
            throw `4. Unknown variable type ${this.options.type}`;
        }
        return variableType;
    }

    getTypeLine() {
        return `    ${this.columnName}${this.options.notNull && typeof this.options.default == "undefined" ? "" : "?"}: ${this.getType()};`;
    }
}

export class TableInit {
    tableName: string;
    columns: ColumnInit[] = [];
    db: DB;
    typesName: string;
    rowClassName: string;
    primaryKeys: ColumnInit[] = [];

    associationTable: boolean;

    foreginKeys: { foreginColumn: ColumnInit; column: ColumnInit }[] = [];

    constructor(db: DB, tableName: string, options?: TableInitOptions) {
        this.tableName = tableName;
        this.db = db;

        this.associationTable = options?.associationTable ?? false;

        this.typesName = snakeCaseToCamelCase(this.tableName) + "Type";
        this.rowClassName = snakeCaseToCamelCase(this.tableName) + "Row";
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
                column.options.primaryKey = true;
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

        lines.push(`export interface ${this.typesName} {`);

        this.columns.forEach((column) => lines.push(column.getTypeLine()));

        lines.push("}");

        return lines;
    }

    getClassDefinition() {
        const lines = [];

        lines.push(...this.getTypes());

        // lines.push(`class ${this.rowClassName} {`);
        // lines.push(
        //     "    private identifierColumns: {columnName: string, value: string | number | null}[]"
        // );
        // lines.push("    private db: DB");
        // lines.push(
        //     "    constructor(identifierColumns:{columnName: string, value: string | number | null}[], db: DB) {"
        // );
        // lines.push("        this.identifierColumns = identifierColumns");
        // lines.push("        this.db = db");
        // lines.push("    }");

        // this.columns.forEach((column) => {
        //     lines.push(
        //         `    get ${column.columnName}(): ${column.getType()}${column.options.notNull ? "" : " | undefined"} {`
        //     );
        //     lines.push(
        //         "        return (this.db.db.prepare(" +
        //             "`" +
        //             `SELECT ${column.columnName} FROM ${this.tableName} WHERE ` +
        //             " ${this.identifierColumns.map(identifier => identifier.columnName).join('=? AND ')}=?`).get(...this.identifierColumns.map(identifier => identifier.value)) as " +
        //             `${this.typesName})` +
        //             `.${column.columnName} as ${column.getType()}${column.options.notNull ? "" : " | undefined"}`
        //     );

        //     lines.push(`    }`);
        //     lines.push(
        //         `    set ${column.columnName}(newValue: ${column.getType()}${column.options.notNull ? "" : " | undefined"}) {`
        //     );
        //     lines.push(
        //         `        console.warn("TODO", newValue, this.identifierColumns)`
        //     );
        //     lines.push(`    }`);
        // });

        // lines.push("    // *********************");

        // this.columns.forEach((column) => {
        //     if (column.reference && column.referenceAccessName) {
        //         lines.push(
        //             `    get ${column.referenceAccessName}(): ${column.reference.table.rowClassName}${column.options.notNull ? "" : " | undefined"} {`
        //         );
        //         lines.push(
        //             (column.options.notNull
        //                 ? "        "
        //                 : `        if (this.${column.columnName}) `) +
        //                 `return new ${column.reference.table.rowClassName}([{columnName: "${column.reference.columnName}", value: this.${column.columnName}}], this.db)`
        //         );
        //         lines.push(`    }`);
        //     }
        // });
        // lines.push("    // *********************");

        // this.foreginKeys.forEach((foreginKey) => {
        //     lines.push(
        //         `    get ${foreginKey.foreginColumn.table.tableName}() {`
        //     );
        //     console.log(foreginKey.foreginColumn.table.primaryKeys);

        //     const keys = foreginKey.foreginColumn.table.primaryKeys.filter(
        //         (key) => key.columnName != foreginKey.foreginColumn.columnName
        //     );

        //     lines.push(
        //         `        const a ` +
        //             " = this.db.db.prepare(`SELECT " +
        //             `${keys.map((key) => key.columnName).join(",")} FROM ${foreginKey.foreginColumn.table.tableName} WHERE ${foreginKey.foreginColumn.columnName} = ?` +
        //             "`)" +
        //             `.all(this.${foreginKey.column.columnName}) as {${keys.map((key) => `${key.columnName}: ${key.getType()}`).join(",")}}[]`
        //     );
        //     lines.push(
        //         `        return a.map(b => new ${foreginKey.foreginColumn.table.rowClassName}([${keys.map((key) => `{columnName: "${key.columnName}", value:  b.${key.columnName}}`).join(",")}], this.db))`
        //     );
        //     lines.push(`    }`);
        // });

        // lines.push("}");

        // lines.push(
        //     `class ${snakeCaseToCamelCase(this.tableName)} extends BaseTable<${this.typesName}> {`
        // );
        // lines.push("    db: DB");
        // lines.push("    constructor(db: DB) {");
        // lines.push(
        //     `        super("${this.tableName}", db, [${this.columns
        //         .map((column) => {
        //             if (column.options.type == "sqlWrapper-now-func")
        //                 return `{
        //                     columnName: '${column.columnName}',
        //                     type: '${column.options.type}',
        //                 }`;

        //             if (column.options.type == "sqlWrapper-date-on-update-func")
        //                 return `{
        //                     columnName: '${column.columnName}',
        //                     type: '${column.options.type}',
        //                 }`;
        //         })
        //         .filter((columnInfo) => columnInfo)}])`
        // );
        // lines.push("        this.db = db");
        // lines.push("    }");
        // lines.push(
        //     `    get(columnName: string, value: string | number | null): ${this.rowClassName} {`
        // );
        // lines.push(
        //     `        return new ${this.rowClassName}([{columnName: columnName, value: value}], this.db)`
        // );
        // lines.push("    }");
        // lines.push("}");

        // lines.push(
        //     `export const ${this.tableName} = new ${snakeCaseToCamelCase(this.tableName)}(db);`
        // );

        // lines.push("");
        // lines.push("");
        // lines.push("");

        return lines;
    }

    getPythonTables() {
        const lines: string[] = [];

        if (this.associationTable) {
            console.log(this.tableName);

            lines.push(`${this.tableName} = Table(`);
            lines.push(`    '${this.tableName}', Base.metadata,`);
            this.columns.forEach((column) => {
                if (column.reference) {
                    lines.push(
                        `    Column('${column.columnName}', ForeignKey('${column.reference.table.tableName}.${column.reference.columnName}'), primary_key=${column.options.primaryKey ? "True" : "False"}, unique=${column.options.unique ? "True" : "False"}, nullable=${column.options.notNull ? "False" : "True"}),`
                    );
                } else {
                    lines.push(
                        `    Column'${column.columnName}', primary_key=${column.options.primaryKey ? "True" : "False"}, unique=${column.options.unique ? "True" : "False"}, nullable=${column.options.notNull ? "False" : "True"}),`
                    );
                }
            });

            lines.push(")");
            lines.push("");
        } else {
            lines.push(
                `class ${singularizeName(capitalizeFirstLetter(snakeCaseToCamelCase(this.tableName)))}(Base):`
            );
            lines.push(`    __tablename__ = "${this.tableName}"`);

            this.columns.forEach((column) => {
                if (column.reference) {
                    lines.push(
                        `    ${column.columnName} = mapped_column(${column.getSqlAlchemyType()}, ForeignKey('${column.reference.table.tableName}.${column.reference.columnName}'), primary_key=${column.options.primaryKey ? "True" : "False"}, unique=${column.options.unique ? "True" : "False"}, nullable=${column.options.notNull ? "False" : "True"})`
                    );
                } else {
                    lines.push(
                        `    ${column.columnName} = mapped_column(${column.getSqlAlchemyType()}, primary_key=${column.options.primaryKey ? "True" : "False"}, unique=${column.options.unique ? "True" : "False"}, nullable=${column.options.notNull ? "False" : "True"})`
                    );
                }
            });
            lines.push("");

            this.columns
                .filter((column) => column.reference)
                .forEach((column) => {
                    if (!column.reference) return;
                    lines.push(
                        `    # 1 ${column.table.tableName}.${column.columnName} ${column.reference.table.tableName}.${column.reference.columnName}`
                    );
                    lines.push(
                        `    ${singularizeName(column.reference.table.tableName)} = relationship("${singularizeName(capitalizeFirstLetter(snakeCaseToCamelCase(column.reference.table.tableName)))}", back_populates="${this.tableName}")`
                    );
                });
            lines.push("");

            this.foreginKeys.forEach((key) => {
                if (key.foreginColumn.table.associationTable) {
                    if (key.foreginColumn.table.columns.length > 2) {
                        throw `Association table ${key.foreginColumn.table} has more than two columns`;
                    }
                    const column = key.foreginColumn.table.columns.find(
                        (column) => column != key.foreginColumn
                    );

                    if (!column) {
                        throw `Association table ${key.foreginColumn.table} only has one column`;
                    }

                    if (!column.reference) {
                        throw `Column ${column.table.tableName}.${column.columnName} doesn't have a reference`;
                    }
                    lines.push(
                        `    # 2 ${key.column.table.tableName}.${key.column.columnName} ${key.foreginColumn.table.tableName}.${key.foreginColumn.columnName} ${column.table.tableName}.${column.columnName} ${column.reference.table.tableName}.${column.reference.columnName}`
                    );

                    lines.push(
                        `    ${column.reference.table.tableName} = relationship("${singularizeName(capitalizeFirstLetter(snakeCaseToCamelCase(column.reference?.table.tableName)))}", secondary=${column.table.tableName}, back_populates="${this.tableName}")`
                    );
                } else {
                    lines.push(
                        `    # 3 ${key.column.table.tableName}.${key.column.columnName} ${key.foreginColumn.table.tableName}.${key.foreginColumn.columnName}`
                    );
                    lines.push(
                        `    ${key.foreginColumn.table.tableName} = relationship("${singularizeName(capitalizeFirstLetter(snakeCaseToCamelCase(key.foreginColumn.table.tableName)))}", back_populates="${singularizeName(this.tableName)}")`
                    );
                }
            });

            lines.push("");
            lines.push("");
        }

        return lines;
    }

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
                        (columnInfo.type === "sqlWrapper-now-func" ||
                            columnInfo.type ==
                                "sqlWrapper-date-on-update-func") &&
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        !(_object as any)[columnInfo.columnName]
                    ) {
                        console.log("Setting", columnInfo.columnName);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (_object as any)[columnInfo.columnName] =
                            getDatabaseDate();
                    }
                });

                Object.entries(_object).forEach((entry) => {
                    if (entry[1] === true) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (_object as any)[entry[0]] = "TRUE";
                    } else if (entry[1] === false) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (_object as any)[entry[0]] = "FALSE";
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
                    (columnInfo.type === "sqlWrapper-now-func" ||
                        columnInfo.type == "sqlWrapper-date-on-update-func") &&
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    !(object as any)[columnInfo.columnName]
                ) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (object as any)[columnInfo.columnName] = getDatabaseDate();
                }
            });

            Object.entries(object).forEach((entry) => {
                if (entry[1] === true) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (object as any)[entry[0]] = "TRUE";
                } else if (entry[1] === false) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (object as any)[entry[0]] = "FALSE";
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
    DATE_ON_UPDATE = "sqlWrapper-date-on-update-func" as const;

    constructor(dbFile: string) {
        this.db = sqlite(dbFile);
        this.dbFile = dbFile;
    }
    addTable(tableName: string, options?: TableInitOptions) {
        const table = new TableInit(this, tableName, options);
        this.tables.push(table);
        return table;
    }
    commit() {
        this.tables.forEach((table) => table.commit());
    }
    writeClassesToFile(outputFile: string) {
        const lines: string[] = [];
        lines.push("// **********************************************");
        lines.push("// **** File managed by sqlWrapper by RockIt ****");
        lines.push("// ***********^**********************************");
        lines.push("");

        this.tables.map((table) => lines.push(...table.getClassDefinition()));

        writeFileSync(outputFile, lines.join("\n"));
    }

    writePythonClassesToFile(outputFile: string) {
        const lines = [];

        lines.push("# **********************************************");
        lines.push("# **** File managed by sqlWrapper by RockIt ****");
        lines.push("# ***********^**********************************");
        lines.push("");
        lines.push(
            "from sqlalchemy import Table, create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, select"
        );
        lines.push(
            "from sqlalchemy.orm import declarative_base, relationship, Session, joinedload, mapped_column"
        );
        lines.push("Base = declarative_base()");

        this.tables
            .filter((table) => table.associationTable)
            .map((table) => lines.push(...table.getPythonTables()));
        this.tables
            .filter((table) => !table.associationTable)
            .map((table) => lines.push(...table.getPythonTables()));

        lines.push('engine = create_engine("sqlite:///database.db")');
        lines.push("Base.metadata.create_all(engine)");
        lines.push("");
        lines.push("session = Session(engine)");

        writeFileSync(outputFile, lines.join("\n"));
    }
}
