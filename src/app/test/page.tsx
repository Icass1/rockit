"use client";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

function ShowData() {
    const session = useSession();
    if (session.status == "authenticated")
        return <h1>Welcome {session.data.user.username}</h1>;
    else if (session.status == "loading") return <h1>Loading</h1>;
    else if (session.status == "unauthenticated")
        return <h1>unauthenticated</h1>;
}

export default function Home() {
    const session = useSession();

    useEffect(() => {
        if (session.status != "authenticated") return;
        fetch(`http://localhost:8000/auth/me`, {
            headers: {
                Authorization: `Bearer ${session.data?.user.access_token}`,
            },
        })
            .then((data) => data.json())
            .then(console.log);
    }, [session.data?.user.access_token, session.status]);

    return (
        <div className="grid-col grid w-fit">
            <button onClick={() => signOut()}>Signout </button>
            <label>TEST {session.status}</label>
            <ShowData />
        </div>
    );
}
