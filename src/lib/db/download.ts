// ************************************************
// ************** Download log stuff **************
// ************************************************

export interface DownloadDB {
    id: string;
    userId: string;
    dateStarted: string;
    dateEnded: string | undefined;
    downloadURL: string;
    status: string;
}

export const downloadQuery = `CREATE TABLE IF NOT EXISTS download (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    userId TEXT NOT NULL,
    dateStarted TEXT NOT NULL,
    dateEnded TEXT,
    downloadURL TEXT NOT NULL,
    status TEXT NOT NULL
)`;
