// *********************************************
// ************** Error log stuff **************
// *********************************************

export interface ErrorDB {
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

export const errorQuery = `CREATE TABLE IF NOT EXISTS error (
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
