"use client";

import useSession from "@/hooks/useSession";
import { rockIt } from "@/lib/rockit/rockIt";

function ShowData() {
    const session = useSession();
    if (session.status == "authenticated")
        return <h1>Welcome {session.user.username}</h1>;
    else if (session.status == "loading") return <h1>Loading</h1>;
    else if (session.status == "unauthenticated")
        return <h1>unauthenticated</h1>;
}

export default function TestClient() {
    const session = useSession();

    return (
        <div className="grid-col grid w-fit">
            <button onClick={() => rockIt.userManager.signOut()}>
                Signout{" "}
            </button>
            <label>TEST {session.user?.username}</label>
            <ShowData />
        </div>
    );
}
