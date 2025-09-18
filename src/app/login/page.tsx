import { redirect } from "next/navigation";
import LoginModal from "@/components/Auth/LoginModal";
import { getSession } from "@/lib/auth/getSession";
import { signOut } from "next-auth/react";

export default async function LoginPage() {
    const session = await getSession();

    if (session) {
        signOut();
    }

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
