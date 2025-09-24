"use client";

import { signIn } from "next-auth/react";
import Image from "@/components/Image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function LoginModal() {
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");

    const handleSubmit = useCallback(() => {
        signIn("credentials", {
            password,
            username,
            redirect: true,
            callbackUrl: "/",
        });
    }, [password, username]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key == "Enter") {
                handleSubmit();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
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
                <p className="text-fo mt-2 text-sm">
                    Or{" "}
                    <Link
                        href="/signup"
                        className="text-primary md:hover:text-primary/80 font-bold"
                    >
                        create a new account
                    </Link>
                </p>
                <div className="mt-5 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Username"
                                className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.currentTarget.value);
                                }}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="Password"
                                className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.currentTarget.value);
                                }}
                            />
                        </div>
                    </div>
                    <p className="w-full rounded-md bg-[#ed4337] leading-8 text-white"></p>
                    <div className="flex justify-center">
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="flex h-8 w-1/3 items-center justify-center rounded-md bg-green-600 font-bold md:hover:bg-green-800"
                        >
                            Log in
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
