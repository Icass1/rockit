// ************************************************
// ************** Download log stuff **************
// ************************************************

export interface RawDownloadDB {
    id: string;
    userId: string;
    dateStarted: string;
    dateEnded?: string;
    downloadURL: string;
    status: string;
    seen: string;
    success?: number;
    fail?: number;
}

export type DownloadDB<
    Keys extends keyof DownloadDBFull = keyof DownloadDBFull,
> = Pick<DownloadDBFull, Keys>;

export interface DownloadDBFull {
    id: string;
    userId: string;
    dateStarted: string;
    dateEnded?: string;
    downloadURL: string;
    status: string;
    seen: boolean;
    success?: number;
    fail?: number;
}

export const downloadQuery = `CREATE TABLE IF NOT EXISTS download (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    userId TEXT NOT NULL,
    dateStarted TEXT NOT NULL,
    dateEnded TEXT,
    downloadURL TEXT NOT NULL,
    status TEXT NOT NULL,
    seen BOOLEAN DEFAULT "1" NOT NULL,
    success INTEGER,
    fail INTEGER
)`;

export function parseDownload(
    download: RawDownloadDB | undefined
): DownloadDB | undefined {
    if (!download) {
        return undefined;
    }

    return {
        id: download.id,
        userId: download.userId,
        dateStarted: download.dateStarted,
        dateEnded: download.dateEnded,
        downloadURL: download.downloadURL,
        status: download.status,
        seen: download.seen == "1" ? true : false,
        success: download.success,
        fail: download.fail,
    };
}
