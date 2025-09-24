import { getSession } from "@/lib/utils/auth/getSession";
import { notFound } from "next/navigation";

export default async function AdminSongsPage() {
    const session = await getSession();

    if (!session?.user?.admin) {
        notFound();
    }

    return <div>To do</div>;
}
