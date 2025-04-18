import DBTablePage from "@/components/Admin/DBTablePage/DBTablePage";
import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { notFound } from "next/navigation";

export default async function AdminDBTablePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const session = await getSession();

    if (!session.user.admin) {
        notFound();
    }

    const tables = (
        db
            .prepare("SELECT name FROM sqlite_schema WHERE type='table'")
            .all() as {
            name: string;
        }[]
    ).map((table) => table.name);

    if (!tables.includes(id)) {
        notFound();
    }

    return <DBTablePage table={id} />;
}
