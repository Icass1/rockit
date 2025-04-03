"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import Link from "next/link";

function SessionStatus1() {
    const session = useSession();

    console.log("session", session);

    if (session.status == "authenticated") {
        return <button onClick={() => signOut()}>authenticated</button>;
    } else if (session.status == "unauthenticated") {
        return <Link href={"/login"}>unauthenticated</Link>;
    } else if (session.status == "loading") {
        return <div>loading</div>;
    }
}

export default function SessionStatus() {
    return (
        <SessionProvider>
            <SessionStatus1></SessionStatus1>
        </SessionProvider>
    );
}
