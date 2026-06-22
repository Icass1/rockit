"use client";

import { JSX, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function LoginModal(): JSX.Element {
    const router = useRouter();

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    useEffect((): void => {
        rockIt.authManager.isLoggedInAsync().then((loggedIn) => {
            if (loggedIn) router.push("/");
        });
    }, [router]);

    useEffect(() => {
        const language = navigator.language.split("-")[0] ?? "en";
        const func = async (): Promise<void> => {
            const b =
                await rockIt.vocabularyManager.getVocabularyAsync(language);
            if (b.isOk()) rockIt.vocabularyManager.setVocabulary(b.result);
        };
        func();
    }, []);

    const handleSubmit = useCallback(async (): Promise<void> => {
        if (loading) return;

        setError("");

        if (!username || !password) {
            setError(
                rockIt.vocabularyManager.vocabulary
                    .USER_NAME_AND_PASSWORD_REQUIRED
            );
            return;
        }

        setLoading(true);

        const result = await rockIt.authManager.loginAsync(
            username,
            password,
            rememberMe
        );

        if (!result.success) {
            setError(
                result.error || rockIt.vocabularyManager.vocabulary.ERROR_LOGIN
            );
            setLoading(false);
            return;
        }

        router.push("/");
        router.refresh();
    }, [username, password, rememberMe, router, loading]);

    useEffect((): (() => void) => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Enter") {
                handleSubmit();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return (): void =>
            document.removeEventListener("keydown", handleKeyDown);
    }, [handleSubmit]);

    return (
        <div className="bg-opacity-[.92] absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-black p-8 text-center shadow-lg md:w-full">
            <div id="login-form">
                <div className="flex items-center justify-center space-x-2">
                    <h2 className="text-foreground text-3xl font-extrabold">
                        {$vocabulary.LOG_IN_TO}
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
                    <Link
                        href="/register"
                        className="text-primary md:hover:text-primary/80 font-bold"
                    >
                        {$vocabulary.OR_CREATE_ACCOUNT}
                    </Link>
                </p>

                <div className="mt-5 space-y-6">
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder={$vocabulary.USERNAME}
                            className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                            autoComplete="username"
                            value={username}
                            onChange={(e): void =>
                                setUsername(e.currentTarget.value)
                            }
                        />

                        <input
                            type="password"
                            placeholder={$vocabulary.PASSWORD}
                            className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e): void =>
                                setPassword(e.currentTarget.value)
                            }
                        />
                    </div>

                    {error && (
                        <p className="mx-auto w-fit rounded-md bg-[#ed4337] px-3 py-1 text-white">
                            {error}
                        </p>
                    )}

                    <label
                        htmlFor="remember-me"
                        className="flex cursor-pointer items-center justify-center gap-2 text-sm text-neutral-400"
                    >
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e): void =>
                                setRememberMe(e.target.checked)
                            }
                            className="size-4 accent-green-600"
                        />
                        {$vocabulary.REMEMBER_ME}
                    </label>

                    <div className="flex justify-center">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleSubmit}
                            className="flex h-8 w-1/3 items-center justify-center rounded-md bg-green-600 font-bold disabled:opacity-50 md:hover:bg-green-800"
                        >
                            {loading
                                ? $vocabulary.LOGGING_IN
                                : $vocabulary.LOG_IN}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
