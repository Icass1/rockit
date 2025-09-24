import { getSession } from "@/lib/utils/auth/getSession";
import { Table } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { promises as fs } from "fs";

export default async function AdminDBTablesPage() {
    const session = await getSession();

    if (!session?.user?.admin) {
        notFound();
    }

    const entries = await fs.readdir("database", { withFileTypes: true });

    return (
        <div className="relative flex h-full w-auto p-2 pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24">
            <div className="absolute top-1/2 left-1/2 max-w-96 -translate-x-1/2 -translate-y-1/2 flex-col rounded bg-neutral-700 p-4 px-10">
                <label className="text-xl font-bold">Select a database</label>
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
