"use client";

import { useState, type FormEvent, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function RegisterModal(): JSX.Element {
    const router = useRouter();
    const vocabulary = useVocabulary();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (loading) return;
        setError("");
        if (!username || !password || !repeatPassword) {
            setError(vocabulary.ALL_FIELDS_REQUIRED);
            return;
        }
        if (password !== repeatPassword) {
            setError(vocabulary.PASSWORDS_DONT_MATCH);
            return;
        }
        setLoading(true);
        try {
            const result = await rockIt.authManager.registerAsync(
                username,
                password,
                repeatPassword
            );
            if (!result.success) {
                setError(result.error || vocabulary.ERROR_REGISTER);
                return;
            }
            router.replace("/");
            router.refresh();
        } catch {
            setError(vocabulary.ERROR_REGISTER);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-scrim text-foreground absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl p-8 text-center shadow-xl backdrop-blur-2xl">
            <Image
                width={2028}
                height={614}
                src="/logo-banner.png"
                className="brand-image mx-auto w-1/3"
                alt="RockIt!"
                priority
            />
            <h1 className="mt-4 text-3xl font-bold">
                {vocabulary.CREATE_ACCOUNT}
            </h1>
            <Link
                href="/login"
                className="text-primary focus-visible:outline-ring mt-3 inline-block font-semibold focus-visible:outline-2"
            >
                {vocabulary.OR_LOG_IN}
            </Link>
            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <Field id="register-username" label={vocabulary.USERNAME}>
                    <Input
                        id="register-username"
                        autoComplete="username"
                        required
                        minLength={3}
                        maxLength={30}
                        pattern="[a-zA-Z0-9_-]+"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                    />
                </Field>
                <Field id="register-password" label={vocabulary.PASSWORD}>
                    <PasswordInput
                        id="register-password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </Field>
                <Field
                    id="register-repeat-password"
                    label={vocabulary.REPEAT_PASSWORD}
                >
                    <PasswordInput
                        id="register-repeat-password"
                        autoComplete="new-password"
                        required
                        value={repeatPassword}
                        onChange={(event) =>
                            setRepeatPassword(event.target.value)
                        }
                    />
                </Field>
                {error && (
                    <p role="alert" className="text-destructive text-sm">
                        {error}
                    </p>
                )}
                <Button type="submit" loading={loading}>
                    {vocabulary.CREATE_ACCOUNT}
                </Button>
            </form>
        </div>
    );
}
