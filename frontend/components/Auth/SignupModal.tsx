"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import UsernameInput from "./UsernameInput";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";

export default function SignupModal() {
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [username, setUsername] = useState("");

    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (password != repeatPassword) {
            setError("Passwords doesn't match");
            return;
        }

        console.log({ username, password, repeatPassword });

        const response = await fetch(`${rockIt.BACKEND_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, repeatPassword }),
        });

        if (response.ok) {
            signIn("credentials", { password, username, callbackUrl: "/" });
        } else {
            const errorJson = await response.json();

            if (errorJson.error) {
                setError(errorJson.error);
            } else {
                setError("Unknow error");
            }
        }
    };

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
            <p className="text-fo mt-2 text-sm">
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

                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                            autoComplete="new-password"
                            required
                            className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                            placeholder="Password"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            value={repeatPassword}
                            onChange={(e) =>
                                setRepeatPassword(e.currentTarget.value)
                            }
                            autoComplete="new-password"
                            placeholder="Repeat password"
                            className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                        />
                    </div>
                </div>
                {error && (
                    <p className="mx-auto w-fit rounded-md bg-[#ed4337] px-2 py-1 text-white">
                        {error}
                    </p>
                )}
                <div className="flex justify-center">
                    <button
                        onClick={handleSubmit}
                        className="flex h-8 w-1/3 items-center justify-center rounded-md bg-blue-600 font-bold md:hover:bg-blue-800"
                    >
                        Sign up
                    </button>
                </div>
            </div>
        </div>
    );
}
