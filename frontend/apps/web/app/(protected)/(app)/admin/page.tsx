import { JSX } from "react";
import { redirect } from "next/navigation";
import { getUserInServer } from "@/lib/getUserInServer";
import { Http } from "@/lib/http";
import AdminClient from "@/components/Admin/AdminClient";

export default async function AdminPage(): Promise<JSX.Element> {
    const user = await getUserInServer();

    if (!user) redirect("/login");
    if (!user.admin) redirect("/");

    const result = await Http.getAllBuilds();
    const builds = result.isOk() ? result.result.builds : [];

    return <AdminClient builds={builds} />;
}
