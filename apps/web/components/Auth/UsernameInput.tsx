"use client";

import { ChangeEvent, JSX, useEffect, useState } from "react";

function validateUsername(value: string): string | null {
    if (value === "") return null;
    if (value.length < 3 || value.length > 30)
        return "Username must be between 3 and 30 characters";
    if (!/^[a-zA-Z0-9_-]+$/.test(value))
        return "Only letters, numbers, _ and - are allowed";
    return null;
}

export default function UsernameInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}): JSX.Element {
    const [error, setError] = useState<string | null>(null);

    useEffect((): void => {
        setError(validateUsername(value));
    }, [value]);

    return (
        <div className="mx-auto flex w-4/5 flex-col">
            {error && (
                <label className="text-destructive text-left text-xs">
                    {error}
                </label>
            )}
            <input
                value={value}
                onChange={onChange}
                autoComplete="username"
                required
                className="text-1xl bg-input text-foreground-strong mt-1 rounded-full px-5 py-1"
                placeholder="Username"
            />
        </div>
    );
}
