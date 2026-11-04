import { JSX } from "react";
import { redirect } from "next/navigation";
import { getUserInServer } from "@/lib/getUserInServer";
import LoginModal from "@/components/Auth/LoginModal";

export default async function LoginPage(): Promise<JSX.Element> {
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
            <LoginModal />
        </div>
    );
}
