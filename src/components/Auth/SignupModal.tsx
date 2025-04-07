"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import UsernameInput from "./UsernameInput";
import Image from "@/components/Image";

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

        const response = await fetch("/api/auth/signup", {
            method: "POST",
            body: JSON.stringify({ username, password, repeatPassword }),
        });

        if (response.ok) {
            signIn("credentials", { password, username });
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
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-lg w-[90%] md:w-full p-8 bg-black bg-opacity-[.92] rounded-xl shadow-lg text-center">
            <Image src="/logo-banner.png" className="w-1/3" alt="Rock It!" />
            <h2 className="text-3xl mt-4 font-extrabold text-foreground">
                Create an Account
            </h2>
            <p className="mt-2 text-sm text-fo">
                Or{" "}
                <Link
                    href="/login"
                    className="font-bold text-primary md:hover:text-primary/80"
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
                            className="mt-1 w-4/5 rounded-full text-1xl px-5 py-1 bg-[#202020] text-white"
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
                            className="mt-1 w-4/5 rounded-full text-1xl px-5 py-1 bg-[#202020] text-white"
                        />
                    </div>
                </div>
                {error && (
                    <p className="text-white bg-[#ed4337] rounded-md w-fit py-1 px-2 mx-auto">
                        {error}
                    </p>
                )}
                <div className="flex justify-center">
                    <button
                        onClick={handleSubmit}
                        className="w-1/3 h-8 rounded-md bg-blue-600 flex justify-center items-center md:hover:bg-blue-800 font-bold"
                    >
                        Sign up
                    </button>
                </div>
            </div>
        </div>
    );
}
