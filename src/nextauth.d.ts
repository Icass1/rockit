// types/next-auth.d.ts
import type NextAuth from "next-auth";

declare module "next-auth" {
    interface User {
        id: string;
        username: string;
        admin: boolean;
        lang: string;
    }

    interface Session {
        user: {
            id: string;
            username: string;
            admin: boolean;
            lang: string;
            libraryView: "byArtist" | "grid";
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        username: string;
        admin: boolean;
        lang: string;
        sub: string;
        iat: number;
        exp: number;
        jti: string;
    }
}

export { NextAuth };
