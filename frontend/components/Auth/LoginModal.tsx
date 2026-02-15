"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { rockIt } from "@/lib/rockit/rockIt";

export default function LoginModal() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = useCallback(async () => {
        if (loading) return;

        setError("");

        if (!username || !password) {
            setError("Username and password are required");
            return;
        }

        try {
            setLoading(true);

            const res = await fetch(`${rockIt.BACKEND_URL}/auth/login`, {
                method: "POST",
                credentials: "include", // 🔴 CLAVE → guarda la cookie de sesión
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (!res.ok) {
                let message = "Login failed";

                try {
                    const data = await res.json();
                    message = data.detail || data.error || message;
                } catch {
                    message = await res.text();
                }

                setError(message);
                setLoading(false);
                return;
            }

            // ✅ Ya estás autenticado (cookie creada)
            router.push("/");
            router.refresh(); // sincroniza Server Components con la nueva sesión
        } catch (err) {
            console.error(err);
            setError("Network error");
            setLoading(false);
        }
    }, [username, password, router, loading]);

    // Permitir Enter para enviar (como antes)
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
                        alt="Rock It!"
                    />
                </div>

                <p className="mt-2 text-sm">
                    Or{" "}
                    <Link
                        href="/signup"
                        className="text-primary font-bold md:hover:text-primary/80"
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
                            onChange={(e) =>
                                setUsername(e.currentTarget.value)
                            }
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.currentTarget.value)
                            }
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
                            className="flex h-8 w-1/3 items-center justify-center rounded-md bg-green-600 font-bold md:hover:bg-green-800 disabled:opacity-50"
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
