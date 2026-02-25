"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import UsernameInput from "./UsernameInput";
import { rockIt } from "@/lib/rockit/rockIt";

export default function SignupModal() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = useCallback(async () => {
        setError("");

        if (loading) return;

        if (!username || !password || !repeatPassword) {
            setError("All fields are required");
            return;
        }

        if (password !== repeatPassword) {
            setError("Passwords don't match");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${rockIt.BACKEND_URL}/auth/register`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username,
                        password,
                        repeatPassword,
                    }),
                }
            );

            if (!response.ok) {
                const text = await response.text();
                setError(text || "Register failed");
                setLoading(false);
                return;
            }

            router.push("/");
            router.refresh(); // fuerza sync del estado en layouts/server components
        } catch (err) {
            console.error(err);
            setError("Network error");
            setLoading(false);
        }
    }, [loading, password, repeatPassword, router, username]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                handleSubmit();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleSubmit]);

    return (
        <div className="bg-opacity-[.92] absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-black p-8 text-center shadow-lg md:w-full">
            <Image
                width={2028}
                height={614}
                src="/logo-banner.png"
                className="w-1/3"
                alt="Rock It!"
            />

            <h2 className="text-foreground mt-4 text-3xl font-extrabold">
                Create an Account
            </h2>

            <p className="mt-2 text-sm">
                Or{" "}
                <Link
                    href="/login"
                    className="text-primary md:hover:text-primary/80 font-bold"
                >
                    log in with an existing account
                </Link>
            </p>

            <div className="mt-5 space-y-6">
                <div className="space-y-4">
                    <UsernameInput
                        value={username}
                        onChange={(e) => setUsername(e.currentTarget.value)}
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        autoComplete="new-password"
                        className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                        placeholder="Password"
                    />

                    <input
                        type="password"
                        value={repeatPassword}
                        onChange={(e) =>
                            setRepeatPassword(e.currentTarget.value)
                        }
                        autoComplete="new-password"
                        className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                        placeholder="Repeat password"
                    />
                </div>

                {error && (
                    <p className="mx-auto w-fit rounded-md bg-[#ed4337] px-2 py-1 text-white">
                        {error}
                    </p>
                )}

                <div className="flex justify-center">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex h-8 w-1/3 items-center justify-center rounded-md bg-blue-600 font-bold disabled:opacity-50 md:hover:bg-blue-800"
                    >
                        {loading ? "Creating..." : "Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
}
