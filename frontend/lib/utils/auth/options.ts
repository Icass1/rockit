import { ENV } from "@/rockitEnv";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const nextAuthOptions: NextAuthOptions = {
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

                console.log(`${ENV.BACKEND_URL}/auth/login`, {
                    username,
                    password,
                });

                const response = await fetch(`${ENV.BACKEND_URL}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: username,
                        password: password,
                    }),
                });

                if (!response.ok) {
                    return null;
                }

                const data = await response.json();

                console.log(data);

                return {
                    id: data.user.id,
                    username: data.user.username,
                    admin: data.user.admin,
                    lang: data.user.lang,
                    access_token: data.access_token,
                    image: data.user.image,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = user;
            }
            return token;
        },

        async session({ session, token }) {
            session.user = token.user;
            session.accessToken = token.accessToken as string;
            return session;
        },
    },

    secret: ENV.NEXTAUTH_SECRET,
};
