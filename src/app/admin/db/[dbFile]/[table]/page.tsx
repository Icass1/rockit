import DBTablePage from "@/components/Admin/DBTablePage/DBTablePage";
import { getSession } from "@/lib/utils/auth/getSession";
import { notFound } from "next/navigation";
import sqlite from "better-sqlite3";

export default async function AdminDBTablePage({
    params,
}: {
    params: Promise<{ table: string; dbFile: string }>;
}) {
    const { table, dbFile } = await params;

    const session = await getSession();

    if (!session?.user?.admin) {
        notFound();
    }

    let tables: string[];

    if (dbFile == "current") {
        tables = (
            db
                .prepare("SELECT name FROM sqlite_schema WHERE type='table'")
                .all() as {
                name: string;
            }[]
        ).map((table) => table.name);
    } else {
        const tempDb = sqlite(`database/${dbFile}`, { readonly: true });

        tables = (
            tempDb
                .prepare("SELECT name FROM sqlite_schema WHERE type='table'")
                .all() as {
                name: string;
            }[]
        ).map((table) => table.name);
    }

    if (!tables.includes(table)) {
        notFound();
    }

    return <DBTablePage dbFile={dbFile} table={table} tables={tables} />;
}
