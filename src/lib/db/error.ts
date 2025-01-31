// *********************************************
// ************** Error log stuff **************
// *********************************************

import { checkTable, db, type Column } from "@/db/db";

export type ErrorDB<Keys extends keyof RawErrorDB = keyof RawErrorDB> = Pick<
    RawErrorDB,
    Keys
>;

export interface RawErrorDB {
    id: string;
    msg: string | undefined;
    source: string | undefined;
    lineNo: number | undefined;
    columnNo: number | undefined;
    errorMessage: string | undefined;
    errorCause: string | undefined;
    errorName: string | undefined;
    errorStack: string | undefined;
    dateAdded: number;
    userId: string | undefined;
}

export function parseError(error: RawErrorDB | undefined): ErrorDB | undefined {
    if (!error) {
        return undefined;
    }
    return {
        id: error.id,
        msg: error.msg,
        source: error.source,
        lineNo: error.lineNo,
        columnNo: error.columnNo,
        errorMessage: error.errorMessage,
        errorCause: error.errorCause,
        errorName: error.errorName,
        errorStack: error.errorStack,
        dateAdded: error.dateAdded,
        userId: error.userId,
    };
}

const errorQuery = `CREATE TABLE IF NOT EXISTS error (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    msg TEXT,
    source TEXT,
    lineNo INTEGER,
    columnNo INTEGER,
    errorMessage TEXT,
    errorCause TEXT,
    errorName TEXT,
    errorStack TEXT,
    dateAdded INTEGER,
    userId TEXT
)`;

checkTable(
    "error",
    errorQuery,
    db.prepare("PRAGMA table_info(error)").all() as Column[]
);
db.exec(errorQuery);
