// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken: string; // Now TS knows this exists
        user: {
            id: string;
            username: string;
            access_token: string;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        username: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken: string;
        user: User;
    }
}
