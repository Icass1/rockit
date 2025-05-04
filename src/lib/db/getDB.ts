import { db } from "./db";
import sqlite from "better-sqlite3";

export function getDB(dbFile: string) {
    if (dbFile == "current") {
        return { db, shouldClose: false };
    } else {
        return { db: sqlite(`database/${dbFile}`), shouldClose: true };
    }
}
