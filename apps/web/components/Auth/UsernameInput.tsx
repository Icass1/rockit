"use client";

import { useId, type ChangeEvent, type JSX } from "react";
import { validateUsername } from "@rockit/shared";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function UsernameInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const id = useId();
    const error = validateUsername(value);
    return (
        <div className="mx-auto flex w-4/5 flex-col">
            {error && (
                <p
                    id={`${id}-error`}
                    className="text-destructive text-left text-xs"
                >
                    {vocabulary[error]}
                </p>
            )}
            <input
                id={id}
                aria-label={vocabulary.USERNAME}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                value={value}
                onChange={onChange}
                autoComplete="username"
                required
                className="text-1xl bg-input text-foreground-strong mt-1 rounded-full px-5 py-1"
                placeholder={vocabulary.USERNAME}
            />
        </div>
    );
}
