// import { BetterSqlite3Adapter } from "@lucia-auth/adapter-sqlite";
// import { Lucia } from "lucia";
// import { db } from "@/db/db";
// import type { UserDB } from "@/db/user";

// const adapter = new BetterSqlite3Adapter(db, {
//     user: "user",
//     session: "session",
// });

// export const lucia = new Lucia(adapter, {
//     sessionCookie: {
//         attributes: {
//             secure: import.meta.env.PROD,
//         },
//     },
//     getUserAttributes: (attributes) => {
//         return {
//             username: attributes.username,
//             id: attributes.id,
//             lang: attributes.lang,
//             admin: attributes.admin,
//         };
//     },
// });

// declare module "lucia" {
//     interface Register {
//         Lucia: typeof lucia;
//         DatabaseUserAttributes: UserDB;
//     }
// }
