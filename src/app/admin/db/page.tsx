import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { Table } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminDBTablesPage() {
    const session = await getSession();

    if (!session.user.admin) {
        notFound();
    }
    const tables = db
        .prepare("SELECT name FROM sqlite_schema WHERE type='table'")
        .all() as { name: string }[];

    return (
        <div className="relative flex h-full w-auto p-2 pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24">
            <div className="absolute top-1/2 left-1/2 max-w-96 -translate-x-1/2 -translate-y-1/2 flex-col rounded bg-neutral-700 p-4">
                <label className="text-xl font-bold">Select table</label>
                {tables.map((table) => (
                    <Link
                        key={table.name}
                        href={`/admin/db/${table.name}`}
                        className="flex flex-row items-center gap-2"
                    >
                        <Table className="h-4 w-4" /> {table.name}
                    </Link>
                ))}
            </div>
        </div>
    );
}
