import { Lucia } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
// import sqlite from "better-sqlite3";
// import type { DatabaseUser } from "./types";
import { db } from 'astro:db';
import { asDrizzleTable } from "@astrojs/db/runtime";

import { Session, User } from "@/db/tables";

const adapter = new DrizzleSQLiteAdapter(
    db as any,
    // @ts-ignore
    asDrizzleTable("Session", Session),
    // @ts-ignore
    asDrizzleTable("User", User),
);

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            // set to `true` when using HTTPS
            secure: import.meta.env.PROD
        }
    },
    getUserAttributes: (attributes) => {
        let out: typeof User = { columns: User.columns, deprecated: false, foreignKeys: undefined, indexes: undefined }
        for (let k of Object.keys(User.columns)) {
            if (Object.keys(attributes).includes(k)) {
                // @ts-ignore
                out.columns[k] = attributes[k]
            }
        }
        return out.columns;
    }
});

declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        // DatabaseUserAttributes: DatabaseUser;
        DatabaseUserAttributes: typeof User.columns;
    }
}
