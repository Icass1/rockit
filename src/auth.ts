import { Lucia } from "lucia";
import { BetterSqlite3Adapter } from "@lucia-auth/adapter-sqlite";
import { db, type UserDB } from "./lib/db";


const adapter = new BetterSqlite3Adapter(db, {
    user: "user",
    session: "session"
});

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            secure: import.meta.env.PROD
        }
    },
    getUserAttributes: (attributes) => {
        return {
            username: attributes.username,
            id: attributes.id,
        };
    }
});

declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: UserDB;
    }
}
