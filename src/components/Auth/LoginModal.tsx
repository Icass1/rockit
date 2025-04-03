"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";

export default function LoginModal() {
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");

    const handleSubmit = () => {
        signIn("credentials", { password, username });
    };

    return (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-lg w-[90%] md:w-full p-8 bg-black bg-opacity-[.92] rounded-xl shadow-lg text-center">
            <div id="login-form">
                <div className="flex justify-center items-center space-x-2">
                    <h2 className="text-3xl font-extrabold text-foreground">
                        Log in to
                    </h2>
                    <Image
                        priority={true}
                        width={1024}
                        height={307}
                        src="/logo-banner.png"
                        className="w-1/2"
                        alt="Rock It!"
                    />
                </div>
                <p className="mt-2 text-sm text-fo">
                    Or{" "}
                    <button
                        onClick={() => {}}
                        className="font-bold text-primary md:hover:text-primary/80"
                    >
                        create a new account
                    </button>
                </p>
                <div className="mt-5 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Username"
                                className="mt-1 w-4/5 rounded-full text-1xl px-5 py-1 bg-[#202020] text-white"
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
                                className="mt-1 w-4/5 rounded-full text-1xl px-5 py-1 bg-[#202020] text-white"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.currentTarget.value);
                                }}
                            />
                        </div>
                    </div>
                    <p className="text-white bg-[#ed4337] w-full rounded-md leading-8"></p>
                    <div className="flex justify-center">
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="w-1/3 h-8 rounded-md bg-green-600 flex justify-center items-center md:hover:bg-green-800 font-bold"
                        >
                            Log in
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
