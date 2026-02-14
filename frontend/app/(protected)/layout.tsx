import { getUserInServer } from "@/lib/getUserInServer";
import { redirect } from "next/navigation";

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
