// ****************************************
// ************** Images stuff **************
// ****************************************

import { checkTable, db, type Column } from "@/db/db";

export interface ImageDB {
    id: string;
    url: string;
    path: string;
}

const imageQuery = `CREATE TABLE IF NOT EXISTS image (
    id TEXT NOT NULL PRIMARY KEY,
    path TEXT NOT NULL,
    url TEXT NOT NULL
)`;

checkTable(
    "image",
    imageQuery,
    db.prepare("PRAGMA table_info(image)").all() as Column[]
);
db.exec(imageQuery);
