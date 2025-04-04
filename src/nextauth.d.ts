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
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        username: string;
        admin: boolean;
        lang: string;
    }
}

export { NextAuth };
