// ****************************************
// ************** Images stuff **************
// ****************************************

export interface ImageDB {
    id: string;
    url: string;
    path: string;
}

export const imageQuery = `CREATE TABLE IF NOT EXISTS image (
    id TEXT NOT NULL PRIMARY KEY,
    path TEXT NOT NULL,
    url TEXT NOT NULL
)`;
