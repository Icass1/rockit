import { redirect } from "next/navigation";
import { AllBuildsResponseSchema } from "@/dto";
import { getUserInServer } from "@/lib/getUserInServer";
import { apiFetch } from "@/lib/utils/apiFetch";
import AdminClient from "@/components/Admin/AdminClient";

export default async function AdminPage() {
    const user = await getUserInServer();

    if (!user) redirect("/login");
    if (!user.admin) redirect("/");

    const result = await apiFetch("/admin/builds", AllBuildsResponseSchema);
    const builds = result.isOk() ? result.result.builds : [];

    return <AdminClient builds={builds} />;
}
