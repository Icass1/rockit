interface Albums {
    id?: string;
    image: string;
    name: string;
    release_date: string;
    popularity?: number;
    disc_count: number;
    date_added: string;
}
interface Songs {
    id?: string;
    name: string;
    duration: number;
    track_number: number;
    disc_number: number;
    popularity?: number;
    image?: string;
    path?: string;
    album_id: string;
    date_added: string;
    isrc: string;
    download_url?: string;
    lyrics?: string;
    dynamic_lyrics?: string;
}
import { fileURLToPath } from "url";
// ;

import { Database } from "better-sqlite3";
import sqlite from "better-sqlite3";
import { readFile, readFileSync } from "fs";

function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

interface ColumnOptions {
    type: "INTEGER" | "TEXT" | "DATE";
    primaryKey?: boolean;
    unique?: boolean;
    notNull?: boolean;
}
class Column {
    tableName: string;
    columnName: string;
    options: ColumnOptions;
    reference: Column | undefined;

    constructor(columnName: string, tableName: string, options: ColumnOptions) {
        this.tableName = tableName;
        this.columnName = columnName;
        this.options = options;
    }

    setReference(column: Column) {
        this.reference = column;
    }

    getQuery() {
        const tokens: string[] = [];

        tokens.push(this.columnName);
        tokens.push(this.options.type);

        if (this.options.notNull) {
            tokens.push("NOT NULL");
        }
        if (this.options.primaryKey) {
            tokens.push("PRIMARY KEY");
        }
        if (this.options.unique) {
            tokens.push("UNIQUE");
        }
        return tokens.join(" ");
    }
    getReferences(): string | undefined {
        if (!this.reference) return;

        return `FOREIGN KEY (${this.columnName}) REFERENCES ${this.reference.tableName}(${this.reference.columnName})`;
    }
    getTypes() {
        // id: string;
        let variableType: string;

        if (this.options.type == "DATE") {
            variableType = "string";
        } else if (this.options.type == "INTEGER") {
            variableType = "number";
        } else if (this.options.type == "TEXT") {
            variableType = "string";
        } else {
            variableType = "undefined";
        }

        return `    ${this.columnName}${this.options.notNull ? "" : "?"}: ${variableType};`;
    }
}

class Row<T> {
    table: Table<T>;
    column: string;
    value: string | number | null;
    constructor(
        table: Table<T>,
        column: string,
        value: string | number | null
    ) {
        this.table = table;
        this.column = column;
        this.value = value;
        return new Proxy(this, {
            set(target, prop, value) {
                console.log(
                    `UPDATE ${target.table.tableName} SET ${String(prop)}=? WHERE ${column}=?`,
                    [value, target.value]
                );
                return true;
            },
            get(target, prop) {
                console.log(
                    `SELECT ${String(prop)} FROM ${target.table.tableName} WHERE ${column}=?`,
                    [target.value]
                );
                return "TASDFASEVASVAwsdf";
            },
        });
    }
}

class Table<T> {
    tableName: string;
    columns: Column[] = [];
    db: DB;
    constructor(db: DB, tableName: string) {
        this.tableName = tableName;
        this.db = db;
    }

    addColumn(columnName: string, options: ColumnOptions) {
        const column = new Column(columnName, this.tableName, options);
        this.columns.push(column);

        this[columnName] = columnName;

        return column;
    }

    getQuery() {
        const query: string[] = [];

        // query.push(`CREATE TABLE IF NOT EXISTS ${this.tableName} (`);

        this.columns.forEach((column) => query.push(column.getQuery()));
        this.columns.forEach((column) => {
            const references = column.getReferences();
            if (references) {
                query.push(references);
            }
        });
        // query.push(`)`);

        return (
            `CREATE TABLE IF NOT EXISTS ${this.tableName} (\n` +
            query.join(",\n") +
            "\n)"
        );
    }

    getTypes() {
        console.log(`interface ${capitalizeFirstLetter(this.tableName)} {`);
        const types = this.columns.map((column) => column.getTypes());
        console.log(types.join("\n"));
        console.log("}");

        return "";
    }

    get(column: string, value: string | number | null): Row<T> {
        return new Row<T>(this, column, value);
    }
    insert(object: T) {
        console.log("Insert", { object });
    }
    commit() {
        this.db.db.exec(this.getQuery());
    }
}

class DB {
    db: Database;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tables: Table<any>[] = [];

    fileContent: string;

    constructor() {
        this.db = sqlite("database/test-database2.db");

        this.fileContent = readFileSync(fileURLToPath(import.meta.url), "utf8");
    }
    addTable<T>(tableName: string) {
        const table = new Table<T>(this, tableName);
        this.tables.push(table);
        return table;
    }
    commit() {
        this.tables.forEach((table) => table.commit());
        const type = this.tables.map((table) => table.getTypes());
    }
}

export const db = new DB();

const albums = db.addTable("albums");
const albumId = albums.addColumn("id", {
    type: "TEXT",
    primaryKey: true,
    unique: true,
});
albums.addColumn("image", { type: "TEXT", notNull: true });
albums.addColumn("name", { type: "TEXT", notNull: true });
albums.addColumn("release_date", { type: "DATE", notNull: true });
albums.addColumn("popularity", { type: "INTEGER" });
albums.addColumn("disc_count", { type: "INTEGER", notNull: true });
albums.addColumn("date_added", { type: "DATE", notNull: true });

export const songs = db.addTable<Songs>("songs");

songs.addColumn("id", {
    type: "TEXT",
    primaryKey: true,
    unique: true,
});
songs.addColumn("name", { type: "TEXT", notNull: true });
songs.addColumn("duration", { type: "INTEGER", notNull: true });
songs.addColumn("track_number", { type: "INTEGER", notNull: true });
songs.addColumn("disc_number", { type: "INTEGER", notNull: true });
songs.addColumn("popularity", { type: "INTEGER" });
songs.addColumn("image", { type: "TEXT" });
songs.addColumn("path", { type: "TEXT" });
songs
    .addColumn("album_id", {
        type: "TEXT",
        notNull: true,
    })
    .setReference(albumId);
songs.addColumn("date_added", { type: "DATE", notNull: true });
songs.addColumn("isrc", {
    type: "TEXT",
    notNull: true,
    unique: true,
});
songs.addColumn("download_url", {
    type: "TEXT",
});
songs.addColumn("lyrics", {
    type: "TEXT",
});
songs.addColumn("dynamic_lyrics", {
    type: "TEXT",
});

// console.log("ASD")
db.commit();

songs.insert({ id: "AS", name: "A" });

// console.log(songs.get(songs.id, "asfasdfas").isrc);
// songs.get(songs.id, "asfasdfas").isrc = "ASDF";
