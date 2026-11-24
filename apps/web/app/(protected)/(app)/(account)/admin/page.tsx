import { JSX } from "react";
import { redirect } from "next/navigation";
import { EAdminClientTab } from "@/models/enums/adminClientTab";
import { ServerHttp } from "@/lib/api/server";
import { getUserInServer } from "@/lib/getUserInServer";
import AdminClient from "@/components/Admin/AdminClient";

export default async function AdminPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}): Promise<JSX.Element> {
    const user = await getUserInServer();

    if (!user || user === "offline") return <></>;
    if (!user.admin) redirect("/");

    const result = await ServerHttp.getAllBuilds();
    const builds = result.isOk() ? result.result.builds : [];

    const tab = (await searchParams).tab;
    const initialTab = Object.values(EAdminClientTab).includes(
        tab as EAdminClientTab
    )
        ? (tab as EAdminClientTab)
        : EAdminClientTab.BUILDS;
    return <AdminClient builds={builds} initialTab={initialTab} />;
}
