"use client";

import LoginModal from "@/components/Auth/LoginModal";
import { signOut, useSession } from "next-auth/react";

export default function LoginPage() {
    const session = useSession();

    if (session.status == "authenticated") {
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
