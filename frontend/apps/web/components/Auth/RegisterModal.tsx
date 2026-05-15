"use client";

import { JSX, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import UsernameInput from "@/components/Auth/UsernameInput";

export default function SignupModal(): JSX.Element {
    const router = useRouter();

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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
        setError("");

        if (loading) return;

        if (!username || !password || !repeatPassword) {
            setError(
                rockIt.vocabularyManager.vocabulary.ALL_FIELDS_REQUIRED
            );
            return;
        }

        if (password !== repeatPassword) {
            setError(
                rockIt.vocabularyManager.vocabulary.PASSWORDS_DONT_MATCH
            );
            return;
        }

        setLoading(true);

        const result = await rockIt.authManager.registerAsync(
            username,
            password,
            repeatPassword
        );

        if (!result.success) {
            setError(
                result.error ||
                    rockIt.vocabularyManager.vocabulary.ERROR_REGISTER
            );
            setLoading(false);
            return;
        }

        router.push("/");
        router.refresh();
    }, [loading, password, repeatPassword, router, username]);

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
            <Image
                width={2028}
                height={614}
                src="/logo-banner.png"
                className="w-1/3"
                alt="RockIt!"
                priority
            />

            <h2 className="text-foreground mt-4 text-3xl font-extrabold">
                {$vocabulary.CREATE_ACCOUNT}
            </h2>

            <p className="mt-2 text-sm">
                <Link
                    href="/login"
                    className="text-primary md:hover:text-primary/80 font-bold"
                >
                    {$vocabulary.OR_LOG_IN}
                </Link>
            </p>

            <div className="mt-5 space-y-6">
                <div className="space-y-4">
                    <UsernameInput
                        value={username}
                        onChange={(e): void =>
                            setUsername(e.currentTarget.value)
                        }
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e): void =>
                            setPassword(e.currentTarget.value)
                        }
                        autoComplete="new-password"
                        className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                        placeholder={$vocabulary.PASSWORD}
                    />

                    <input
                        type="password"
                        value={repeatPassword}
                        onChange={(e): void =>
                            setRepeatPassword(e.currentTarget.value)
                        }
                        autoComplete="new-password"
                        className="text-1xl mt-1 w-4/5 rounded-full bg-[#202020] px-5 py-1 text-white"
                        placeholder={$vocabulary.REPEAT_PASSWORD}
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
                        {loading
                            ? $vocabulary.CREATING
                            : $vocabulary.SIGN_UP}
                    </button>
                </div>
            </div>
        </div>
    );
}
