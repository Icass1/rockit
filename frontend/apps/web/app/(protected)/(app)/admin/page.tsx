import { redirect } from "next/navigation";
import { Http } from "@rockit/packages/shared/http/http";
import { getUserInServer } from "@/lib/getUserInServer";
import AdminClient from "@/components/Admin/AdminClient";

export default async function AdminPage() {
    const user = await getUserInServer();

    if (!user) redirect("/login");
    if (!user.admin) redirect("/");

    const result = await Http.getAllBuilds();
    const builds = result.isOk() ? result.result.builds : [];

    return <AdminClient builds={builds} />;
}
