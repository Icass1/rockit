"use client";

import { SessionProvider } from "next-auth/react";
import UserStatus from "./UserStatus";

export default function Library() {
    return (
        <SessionProvider>
            <div>Library</div>
            <UserStatus></UserStatus>
        </SessionProvider>
    );
}
