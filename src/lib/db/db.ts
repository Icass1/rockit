import { ENV } from "@/rockitEnv";
import sqlite from "better-sqlite3";
import * as fs from "fs";
import { albumQuery } from "./album";
import { downloadQuery } from "./download";
import { errorQuery } from "./error";
import { imageQuery } from "./image";
import { playlistQuery } from "./playlist";
import { songQuery } from "./song";
import { userQuery } from "./user";

fs.mkdir("database", { recursive: false }, () => {});
export const db = sqlite("database/database.db");

export interface Column {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: null | string;
    pk: number;
}

if (ENV.INSECURE_DB_MODE == "true") {
    console.log("***********************************************************");
    console.log("****              Insecure mode is on                  ****");
    console.log("**** Disable it to avoid accidental DROPs in database. ****");
    console.log("***********************************************************");
}

function getDifference(listA: Column[], listB: Column[]) {
    let addedColumns: string[] = [];
    let removedColumns: string[] = [];
    let modifiedColumns: {
        name: string;
        param: string;
        previous: string | null | number;
        next: string | null | number;
    }[] = [];

    listA.map((columnA) => {
        let columnB = listB.find((columnB) => columnA.name == columnB.name);
        if (columnB == undefined) {
            removedColumns.push(columnA.name);
            return;
        }
        if (columnA.dflt_value != columnB?.dflt_value) {
            modifiedColumns.push({
                name: columnA.name,
                param: "dflt_value",
                previous: columnA.dflt_value,
                next: columnB?.dflt_value,
            });
        }
        if (columnA.pk != columnB?.pk) {
            modifiedColumns.push({
                name: columnA.name,
                param: "pk",
                previous: columnA.pk,
                next: columnB?.pk,
            });
        }
        if (columnA.type != columnB?.type) {
            modifiedColumns.push({
                name: columnA.name,
                param: "type",
                previous: columnA.type,
                next: columnB?.type,
            });
        }
        if (columnA.notnull != columnB?.notnull) {
            modifiedColumns.push({
                name: columnA.name,
                param: "notnull",
                previous: columnA.notnull,
                next: columnB?.notnull,
            });
        }
    });

    listB.map((columnB) => {
        let columnA = listA.find((columnA) => columnA.name == columnB.name);
        if (columnA == undefined) {
            addedColumns.push(columnB.name);
            return;
        }
    });

    return { modifiedColumns, removedColumns, addedColumns };
}

export function checkTable(query: string) {
    const tableNameMatch = query.match(
        /(?<=CREATE\sTABLE\sIF\sNOT\sEXISTS\s+).*?(?=\s\()/g
    );
    if (!tableNameMatch) {
        console.error(
            "Table name not found, make sure the query starts with CREATE TABLE IF NOT EXISTS <table name> ("
        );
        return;
    }

    const tableName = tableNameMatch[0].toString();

    const existingColumns = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all() as Column[];

    if (existingColumns.length == 0) {
        console.log(
            "existingColumns.length is 0. This probably means the table doesn't exist"
        );
        return;
    }

    let columns = query
        .split("(")[1]
        .split(")")[0]
        .replaceAll("\n", "")
        .split(",");
    columns = columns.map((column) => {
        while (column.startsWith(" ")) {
            column = column.replace(" ", "");
        }
        return column;
    });
    const newColumns = columns.map((column, index): Column => {
        const columnSplit = column.split(" ");
        return {
            cid: index,
            name: columnSplit[0],
            type: columnSplit[1],
            notnull: column.includes("NOT NULL") ? 1 : 0,
            dflt_value:
                columnSplit.indexOf("DEFAULT") != -1
                    ? columnSplit[columnSplit.indexOf("DEFAULT") + 1]
                    : null,
            pk: column.includes("PRIMARY KEY") ? 1 : 0,
        };
    });

    const { modifiedColumns, addedColumns, removedColumns } = getDifference(
        existingColumns,
        newColumns
    );

    if (modifiedColumns.length > 0) {
        console.warn("Detected column change(s).", modifiedColumns);
    }

    if (removedColumns.length > 0) {
        console.warn("Detected removed column(s).", removedColumns);
        if (ENV.INSECURE_DB_MODE == "true") {
            console.warn("Removing them...");
            removedColumns.map((column) =>
                db.exec(`ALTER TABLE ${tableName} DROP COLUMN ${column}`)
            );
        } else {
            console.log("insecureMode is off, enable it to remove columns.");
        }
    }

    if (addedColumns.length > 0) {
        console.warn("Detected new column(s).", addedColumns);
        console.warn("Adding new columns to database....");
        addedColumns.map((column) => {
            const newColumn = newColumns.find(
                (_column) => _column.name == column
            );
            if (!newColumn) {
                return console.error("Fatal, new column is not defined");
            }

            query = `${newColumn.name} ${newColumn.type} ${
                newColumn.dflt_value ? "DEFAULT " + newColumn.dflt_value : ""
            } ${newColumn.notnull ? "NOT NULL" : ""}`;
            db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${query}`);
        });
    }
}

db.exec(`CREATE TABLE IF NOT EXISTS session (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
)`);

checkTable(downloadQuery);
db.exec(downloadQuery);

checkTable(albumQuery);
db.exec(albumQuery);

checkTable(errorQuery);
db.exec(errorQuery);

checkTable(imageQuery);
db.exec(imageQuery);

checkTable(playlistQuery);
db.exec(playlistQuery);

checkTable(songQuery);
db.exec(songQuery);

checkTable(userQuery);
db.exec(userQuery);
