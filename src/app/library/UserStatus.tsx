"use client";

import { useSession } from "next-auth/react";

export default function UserStatus() {
    const session = useSession();

    console.log("UserStatus", session);
    console.log("UserStatus", session.data?.user);

    return <div>user status</div>;
}
