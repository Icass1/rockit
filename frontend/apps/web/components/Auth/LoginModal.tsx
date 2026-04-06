"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rockIt } from "@/lib/rockit/rockIt";

export default function LoginModal() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        rockIt.authManager.isLoggedInAsync().then(setIsLoggedIn);
    }, [router]);

    const handleSubmit = useCallback(async () => {
        if (loading) return;

        setError("");

        if (!username || !password) {
            setError("Username and password are required");
            return;
        }

        setLoading(true);

        const result = await rockIt.authManager.loginAsync(username, password);

        if (!result.success) {
            setError(result.error || "Login failed");
            setLoading(false);
            return;
        }

        router.push("/");
        router.refresh();
    }, [username, password, router, loading]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                handleSubmit();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleSubmit]);

    if (isLoggedIn) {
        return (
            <div className="bg-opacity-[.92] absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-black p-8 text-center shadow-lg md:w-full">
                <div className="flex items-center justify-center space-x-2">
                    <h2 className="text-foreground text-3xl font-extrabold">
                        You are already logged in
                    </h2>
                </div>
                <div className="mt-5 flex justify-center">
                    <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="flex h-8 w-1/3 items-center justify-center rounded-md bg-green-600 font-bold md:hover:bg-green-800"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-opacity-[.92] absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-black p-8 text-center shadow-lg md:w-full">
            <div id="login-form">
                <div className="flex items-center justify-center space-x-2">
                    <h2 className="text-foreground text-3xl font-extrabold">
                        Log in to
                    </h2>
                    <Image
                        width={1024}
                        height={307}
                        src="/logo-banner.png"
                        className="w-1/2"
                        alt="RockIt!"
                        priority
                    />
                </div>

                <p className="mt-2 text-sm">
                    Or{" "}
                    <Link
                        href="/register"
                        className="text-primary md:hover:text-primary/80 font-bold"
                    >
                        create a new account
                    </Link>
                </p>

                <div className="mt-5 space-y-6">
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Username"
                            className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.currentTarget.value)}
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                        />
                    </div>

                    {error && (
                        <p className="mx-auto w-fit rounded-md bg-[#ed4337] px-3 py-1 text-white">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-center">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleSubmit}
                            className="flex h-8 w-1/3 items-center justify-center rounded-md bg-green-600 font-bold disabled:opacity-50 md:hover:bg-green-800"
                        >
                            {loading ? "Logging in..." : "Log in"}
                        </button>
                    </div>

                    {/* OAuth sigue funcionando porque redirige al backend
                    <div className="pt-2">
                        <a
                            href={`${rockIt.BACKEND_URL}/auth/google`}
                            className="text-sm text-blue-400 hover:underline"
                        >
                            Login with Google
                        </a>
                    </div> */}
                </div>
            </div>
        </div>
    );
}
