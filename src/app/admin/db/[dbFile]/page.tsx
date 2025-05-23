import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { Table } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { promises as fs } from "fs";
import sqlite from "better-sqlite3";

export default async function AdminDBTablesPage({
    params,
}: {
    params: Promise<{ dbFile: string }>;
}) {
    const session = await getSession();

    const { dbFile } = await params;

    const entries = await fs.readdir("database", { withFileTypes: true });

    if (dbFile != "current" && !entries.find((entry) => entry.name == dbFile)) {
        return (
            <div className="relative flex h-full w-auto p-2 pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24">
                <div className="absolute top-1/2 left-1/2 max-w-96 -translate-x-1/2 -translate-y-1/2 flex-col rounded bg-neutral-700 p-4 px-10">
                    <label className="text-xl font-bold">
                        Select a valid database
                    </label>
                    {entries
                        .toSorted()
                        .toReversed()
                        .map((entry) => {
                            let dbName = entry.name;

                            if (entry.name == "database.db") {
                                dbName = "current";
                            }

                            return (
                                <Link
                                    key={entry.name}
                                    href={`/admin/db/${dbName}`}
                                    className="flex flex-row items-center gap-2"
                                >
                                    <Table className="h-4 w-4" /> {dbName}
                                </Link>
                            );
                        })}
                </div>
            </div>
        );
    }

    if (!session?.user?.admin) {
        notFound();
    }

    let tables: { name: string }[];

    if (dbFile == "current") {
        tables = db
            .prepare("SELECT name FROM sqlite_schema WHERE type='table'")
            .all() as { name: string }[];
    } else {
        const tempDb = sqlite(`database/${dbFile}`);

        tables = tempDb
            .prepare("SELECT name FROM sqlite_schema WHERE type='table'")
            .all() as { name: string }[];
    }

    return (
        <div className="relative flex h-full w-auto p-2 pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24">
            <div className="absolute top-1/2 left-1/2 max-w-96 -translate-x-1/2 -translate-y-1/2 flex-col rounded bg-neutral-700 p-4 px-10">
                <label className="text-xl font-bold">Select table</label>
                {tables.map((table) => (
                    <Link
                        key={table.name}
                        href={`/admin/db/${dbFile}/${table.name}`}
                        className="flex flex-row items-center gap-2"
                    >
                        <Table className="h-4 w-4" /> {table.name}
                    </Link>
                ))}
            </div>
        </div>
    );
}
