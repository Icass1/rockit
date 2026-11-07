import { JSX } from "react";
import { redirect } from "next/navigation";
import { ServerHttp } from "@/lib/api/server";
import { getUserInServer } from "@/lib/getUserInServer";
import AdminClient from "@/components/Admin/AdminClient";

export default async function AdminPage(): Promise<JSX.Element> {
    const user = await getUserInServer();

    if (!user || user === "offline") redirect("/login");
    if (!user.admin) redirect("/");

    const result = await ServerHttp.getAllBuilds();
    const builds = result.isOk() ? result.result.builds : [];

    return <AdminClient builds={builds} />;
}
