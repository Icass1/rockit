import { JSX } from "react";
import { redirect } from "next/navigation";
import { getUserInServer } from "@/lib/getUserInServer";
import RegisterModal from "@/components/Auth/RegisterModal";

export default async function RegisterPage(): Promise<JSX.Element> {
    const user = await getUserInServer();
    if (user && user !== "offline") redirect("/");
    return (
        <div
            className="relative h-full w-full"
            style={{
                backgroundImage: "url(/background.jpg)",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
                backgroundPositionY: "bottom",
            }}
        >
            <RegisterModal />
        </div>
    );
}
