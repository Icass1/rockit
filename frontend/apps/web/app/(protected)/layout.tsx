import { redirect } from "next/navigation";
import { getUserInServer } from "@/lib/getUserInServer";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getUserInServer();

    if (!user) {
        redirect("/login");
    }

    return <>{children}</>;
}
