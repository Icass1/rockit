"use client";

import { useState, type FormEvent, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function LoginModal(): JSX.Element {
    const router = useRouter();
    const vocabulary = useVocabulary();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (loading) return;
        setError("");
        if (!username || !password) {
            setError(vocabulary.USER_NAME_AND_PASSWORD_REQUIRED);
            return;
        }
        setLoading(true);
        try {
            const result = await rockIt.authManager.loginAsync(
                username,
                password,
                rememberMe
            );
            if (!result.success) {
                setError(result.error || vocabulary.ERROR_LOGIN);
                return;
            }
            router.replace("/");
            router.refresh();
        } catch {
            setError(vocabulary.ERROR_LOGIN);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-scrim text-foreground absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl p-8 text-center shadow-xl backdrop-blur-2xl">
            <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-bold">{vocabulary.LOG_IN_TO}</h1>
                <Image
                    width={1024}
                    height={307}
                    src="/logo-banner.png"
                    className="brand-image w-1/2"
                    alt="RockIt!"
                    priority
                />
            </div>
            <Link
                href="/register"
                className="text-primary focus-visible:outline-ring mt-3 inline-block font-semibold focus-visible:outline-2"
            >
                {vocabulary.OR_CREATE_ACCOUNT}
            </Link>
            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <Field id="login-username" label={vocabulary.USERNAME}>
                    <Input
                        id="login-username"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                    />
                </Field>
                <Field id="login-password" label={vocabulary.PASSWORD}>
                    <PasswordInput
                        id="login-password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </Field>
                <label
                    htmlFor="remember-me"
                    className="text-muted-foreground flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                >
                    <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onChange={(event) =>
                            setRememberMe(event.target.checked)
                        }
                    />
                    {vocabulary.REMEMBER_ME}
                </label>
                {error && (
                    <p role="alert" className="text-destructive text-sm">
                        {error}
                    </p>
                )}
                <Button type="submit" loading={loading}>
                    {loading ? vocabulary.LOGGING_IN : vocabulary.LOG_IN}
                </Button>
            </form>
        </div>
    );
}
