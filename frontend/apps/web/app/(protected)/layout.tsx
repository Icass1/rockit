import { JSX } from "react";
import { redirect } from "next/navigation";
import { getUserInServer } from "@/lib/getUserInServer";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}): Promise<JSX.Element> {
    const user = await getUserInServer();

    if (user === undefined) {
        redirect("/login");
    }

    return <>{children}</>;
}
