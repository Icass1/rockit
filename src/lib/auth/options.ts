import { db } from "@/lib/db/db";
import { parseUser, RawUserDB, UserDB } from "@/lib/db/user";
import CredentialsProvider from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { JWT } from "next-auth/jwt";
import { AdapterUser } from "next-auth/adapters";
import { Session, User } from "next-auth";
import { AuthOptions } from "next-auth";

export const nextAuthOptions: AuthOptions = {
    session: {
        strategy: "jwt",
    },

    pages: {
        signIn: "/login",
    },

    providers: [
        CredentialsProvider({
            // The name to display on the sign in form (e.g. 'Sign in with...')
            name: "Credentials",
            credentials: {
                password: {},
                username: {},
            },
            async authorize(credentials) {
                if (!credentials) return null;

                const { username } = credentials;
                const { password } = credentials;

                const userDB = parseUser(
                    db
                        .prepare(
                            "SELECT passwordHash,username,id,lang,admin FROM user WHERE username = ?"
                        )
                        .get(username) as RawUserDB
                ) as UserDB<
                    "passwordHash" | "username" | "id" | "admin" | "lang"
                >;

                if (!userDB) {
                    return null;
                }
                const passwordCorrect = await verify(
                    userDB.passwordHash,
                    password
                );

                if (passwordCorrect) {
                    return {
                        id: userDB.id,
                        username: userDB.username,
                        admin: userDB.admin,
                        lang: userDB.lang,
                    };
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }: { token: JWT; user: User | AdapterUser }) {
            // Persist user data to the token right after sign in

            if (user) {
                const userDB = parseUser(
                    db
                        .prepare(
                            "SELECT passwordHash,username,id,lang,admin FROM user WHERE id = ?"
                        )
                        .get(user.id) as RawUserDB
                ) as UserDB<
                    "passwordHash" | "username" | "id" | "admin" | "lang"
                >;
                token.id = user.id;
                token.username = user.username;
                token.admin = userDB.admin;
                token.lang = userDB.lang;
                // Add any other user properties you need
            }
            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            // Send properties to the client

            if (token) {
                const userDB = parseUser(
                    db
                        .prepare(
                            "SELECT passwordHash,username,id,lang,admin,libraryView FROM user WHERE id = ?"
                        )
                        .get(token.id) as RawUserDB
                ) as UserDB<
                    "passwordHash" | "username" | "id" | "admin" | "lang" | "libraryView"
                >;
                session.user = {
                    id: token.id,
                    username: token.username,
                    admin: userDB.admin,
                    lang: userDB.lang,
                    libraryView: userDB.libraryView
                };
            }
            return session;
        },
    },
};
